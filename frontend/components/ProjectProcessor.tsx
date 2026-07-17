import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, ArrowRight, Edit2 } from 'lucide-react';
import { Bead, PatternColorRequirement, MatchedRequirement } from '../types';
import { fileToBase64, cropBottomPortion, colorDistance } from '../utils';
import Tesseract from 'tesseract.js';
import { analyzePatternImage } from '../geminiService';

interface ProjectProcessorProps {
  inventory: Bead[];
  setInventory: React.Dispatch<React.SetStateAction<Bead[]>>;
}

const ProjectProcessor: React.FC<ProjectProcessorProps> = ({ inventory, setInventory }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<MatchedRequirement[] | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传有效的图片文件。');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setRequirements(null);
      setError(null);
      setSuccessMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle Paste Event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const autoMatchColors = useCallback((rawRequirements: PatternColorRequirement[]) => {
    return rawRequirements.map(req => {
      let bestMatchId: string | null = null;
      let minDistance = Infinity;

      // First try to match by exact code name
      const exactMatch = inventory.find(b => b.code.toUpperCase() === req.colorName.toUpperCase());
      if (exactMatch) {
        return { ...req, matchedBeadId: exactMatch.id, hexCode: exactMatch.hex };
      }

      // Fallback to color distance if hex is provided
      if (req.hexCode && req.hexCode !== '#CCCCCC') {
        inventory.forEach(bead => {
          const distance = colorDistance(req.hexCode, bead.hex);
          if (distance < 50 && distance < minDistance) {
            minDistance = distance;
            bestMatchId = bead.id;
          }
        });
      }

      return {
        ...req,
        matchedBeadId: bestMatchId
      };
    });
  }, [inventory]);

  // Advanced OCR Parser for Summary Tables
  const parseSummaryOCR = (text: string): PatternColorRequirement[] => {
    const reqs: PatternColorRequirement[] = [];
    const foundCodes = new Set<string>();

    // Strategy 1: Inline matching (e.g., "A1 120", "A3 (15)", "G14: 49")
    // Matches Letter(s)+Number, optional spaces/punctuation, optional parenthesis, Number
    const inlineRegex = /([A-Z]{1,2}[0-9]{1,2})[\s:：-]*\(?(\d{1,4})\)?/gi;
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
      const code = match[1].toUpperCase();
      const count = parseInt(match[2], 10);
      // Sanity check: count shouldn't be absurdly high or 0
      if (!foundCodes.has(code) && count > 0 && count < 10000) {
        reqs.push({ colorName: code, hexCode: '#CCCCCC', count });
        foundCodes.add(code);
      }
    }

    // If we found a good amount of inline matches, return them
    if (reqs.length >= 3) return reqs;

    // Strategy 2: Stacked matching (e.g., row of codes, row of numbers)
    // Clean up text, split into tokens
    const tokens = text.split(/[\s\n]+/).map(t => t.trim()).filter(t => t.length > 0);
    
    const codes: string[] = [];
    const numbers: number[] = [];
    
    const strictCodeRegex = /^[A-Z]{1,2}[0-9]{1,2}$/i;
    const strictNumRegex = /^\(?(\d{1,4})\)?$/;

    tokens.forEach(token => {
      // Remove common OCR noise characters but keep letters, numbers, and parentheses
      const cleanToken = token.replace(/[^A-Z0-9()]/gi, '');
      if (strictCodeRegex.test(cleanToken)) {
        codes.push(cleanToken.toUpperCase());
      } else {
        const numMatch = cleanToken.match(strictNumRegex);
        if (numMatch) {
          numbers.push(parseInt(numMatch[1], 10));
        }
      }
    });

    // If we found sequences of codes and numbers
    if (codes.length >= 3 && numbers.length >= 3) {
      // Usually, the quantities are at the very end of the OCR output (bottom row).
      // We take the *last* N numbers where N is the number of codes found.
      // This helps ignore grid coordinates (1, 2, 3...) that might have been read first.
      const relevantNumbers = numbers.slice(-codes.length);
      
      if (relevantNumbers.length === codes.length) {
        for(let i = 0; i < codes.length; i++) {
          const code = codes[i];
          const count = relevantNumbers[i];
          if (!foundCodes.has(code) && count > 0) {
            reqs.push({ colorName: code, hexCode: '#CCCCCC', count });
            foundCodes.add(code);
          }
        }
      }
    }

    return reqs;
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setAnalyzeProgress('正在初始化本地识别引擎...');

    try {
      // 1. Prepare images
      const fullBase64 = await fileToBase64(selectedFile);
      // Crop the bottom 35% to isolate the summary table and remove grid noise
      const croppedBase64 = await cropBottomPortion(fullBase64, 0.35);

      // 2. Initialize Tesseract
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setAnalyzeProgress(`本地识别中: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // 3. Try OCR on the cropped bottom portion first (Fastest & Most Accurate)
      setAnalyzeProgress('正在分析底部统计栏...');
      const { data: { text: croppedText } } = await worker.recognize(croppedBase64);
      console.log("Cropped OCR Text:", croppedText);
      
      let rawReqs = parseSummaryOCR(croppedText);

      // 4. If cropped OCR fails, try full image OCR
      if (rawReqs.length < 3) {
        setAnalyzeProgress('底部识别不完整，正在扫描全图...');
        const { data: { text: fullText } } = await worker.recognize(selectedImage);
        console.log("Full OCR Text:", fullText);
        const fullReqs = parseSummaryOCR(fullText);
        if (fullReqs.length > rawReqs.length) {
          rawReqs = fullReqs;
        }
      }

      await worker.terminate();

      // 5. API Fallback (Only if local fails completely)
      if (rawReqs.length === 0 || rawReqs.reduce((acc, r) => acc + r.count, 0) < 10) {
        setAnalyzeProgress('本地识别失败，正在调用云端 AI 识别...');
        rawReqs = await analyzePatternImage(fullBase64, 'image/jpeg');
      }

      if (rawReqs.length === 0) {
        throw new Error("未能从图片中识别到任何色号信息。请确保图片底部包含清晰的色号和数量列表（如 A1 15）。");
      }

      setAnalyzeProgress('识别成功，正在匹配库存...');
      const matched = autoMatchColors(rawReqs);
      setRequirements(matched);

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || '分析过程中发生错误。');
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress('');
    }
  };

  const handleMatchChange = (reqIndex: number, beadId: string) => {
    if (!requirements) return;
    const newReqs = [...requirements];
    newReqs[reqIndex].matchedBeadId = beadId === 'none' ? null : beadId;
    
    // Update hex code for visual display if matched
    if (beadId !== 'none') {
      const bead = inventory.find(b => b.id === beadId);
      if (bead) {
        newReqs[reqIndex].hexCode = bead.hex;
      }
    }
    
    setRequirements(newReqs);
  };

  const handleCountChange = (reqIndex: number, newCount: number) => {
    if (!requirements) return;
    const newReqs = [...requirements];
    newReqs[reqIndex].count = newCount;
    setRequirements(newReqs);
  };

  const handleCodeChange = (reqIndex: number, newCode: string) => {
    if (!requirements) return;
    const newReqs = [...requirements];
    newReqs[reqIndex].colorName = newCode.toUpperCase();
    
    // Try to auto-rematch
    const exactMatch = inventory.find(b => b.code.toUpperCase() === newCode.toUpperCase());
    if (exactMatch) {
      newReqs[reqIndex].matchedBeadId = exactMatch.id;
      newReqs[reqIndex].hexCode = exactMatch.hex;
    } else {
      newReqs[reqIndex].matchedBeadId = null;
    }
    
    setRequirements(newReqs);
  };

  const handleDeduct = () => {
    if (!requirements) return;

    // Validation
    const unmapped = requirements.filter(r => !r.matchedBeadId);
    if (unmapped.length > 0) {
      setError('请在扣减前将所有需要的颜色匹配到库存。');
      return;
    }

    const insufficient = requirements.filter(req => {
      const bead = inventory.find(b => b.id === req.matchedBeadId);
      return !bead || bead.quantity < req.count;
    });

    if (insufficient.length > 0) {
      const confirmMsg = `以下颜色库存不足：\n${insufficient.map(req => {
        const bead = inventory.find(b => b.id === req.matchedBeadId);
        return `${req.colorName}: 缺少 ${req.count - (bead?.quantity || 0)} 颗`;
      }).join('\n')}\n\n是否继续扣减（库存将变为负数）？`;
      
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    setIsDeducting(true);
    
    // Perform deduction
    setInventory(prevInventory => {
      const newInventory = [...prevInventory];
      requirements.forEach(req => {
        const beadIndex = newInventory.findIndex(b => b.id === req.matchedBeadId);
        if (beadIndex !== -1) {
          newInventory[beadIndex] = {
            ...newInventory[beadIndex],
            quantity: newInventory[beadIndex].quantity - req.count
          };
        }
      });
      return newInventory;
    });

    setTimeout(() => {
      setIsDeducting(false);
      setSuccessMessage('成功从库存中扣减拼豆！');
      setRequirements(null);
      setSelectedImage(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 500); // Small delay for UX
  };

  return (
    <div className="p-3 space-y-4 pb-24">
      {/* Upload Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-4">1. 上传图纸</h2>
        
        {!selectedImage ? (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">点击上传或直接粘贴图片</p>
            <p className="text-xs text-gray-400 mt-2">优先离线识别，保护隐私且速度更快</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-start">
            <div className="w-full relative group">
              <img src={selectedImage} alt="Pattern Preview" className="w-full rounded-xl shadow-sm border border-gray-200 object-contain max-h-48 bg-gray-50" />
              <button 
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedFile(null);
                  setRequirements(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm text-gray-600 hover:text-red-600 backdrop-blur-sm transition-opacity"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
            <div className="w-full flex flex-col justify-center space-y-4">
              <p className="text-sm text-gray-600">图片加载成功。准备识别图纸上的色号统计信息。</p>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {analyzeProgress || '正在分析...'}
                  </>
                ) : (
                  <>
                    <ImageIcon className="-ml-1 mr-3 h-5 w-5" />
                    识别图纸
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Editable Cards */}
      {requirements && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">2. 核对并修改</h2>
            <span className="bg-brand-100 text-brand-800 text-xs font-medium px-2.5 py-1 rounded-full">
              共识别出 {requirements.length} 种颜色
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">如果识别有误，您可以直接点击色号或数量进行修改。</p>

          <div className="space-y-3">
            {requirements.map((req, index) => {
              const matchedBead = inventory.find(b => b.id === req.matchedBeadId);
              const isInsufficient = matchedBead ? matchedBead.quantity < req.count : false;

              return (
                <div key={index} className={`bg-white border rounded-xl p-3 shadow-sm flex flex-col gap-3 ${isInsufficient ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full shadow-inner border border-gray-200 shrink-0" style={{ backgroundColor: req.hexCode }}></div>
                      <div className="flex items-center border-b border-dashed border-gray-300 pb-1">
                        <input 
                          type="text" 
                          value={req.colorName}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          className="text-sm font-bold text-gray-900 bg-transparent w-12 focus:outline-none focus:bg-gray-50 rounded px-1 uppercase"
                        />
                        <Edit2 className="h-3 w-3 text-gray-400 ml-1" />
                      </div>
                    </div>
                    <div className="text-right flex items-center border-b border-dashed border-gray-300 pb-1">
                      <input 
                        type="number" 
                        value={req.count}
                        onChange={(e) => handleCountChange(index, parseInt(e.target.value) || 0)}
                        className="text-lg font-bold text-gray-900 bg-transparent w-16 text-right focus:outline-none focus:bg-gray-50 rounded px-1"
                      />
                      <span className="text-xs text-gray-500 ml-1">颗</span>
                      <Edit2 className="h-3 w-3 text-gray-400 ml-1" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                    <select
                      value={req.matchedBeadId || 'none'}
                      onChange={(e) => handleMatchChange(index, e.target.value)}
                      className={`flex-1 bg-transparent text-sm focus:outline-none ${!req.matchedBeadId ? 'text-yellow-600 font-medium' : 'text-gray-700'}`}
                    >
                      <option value="none">-- 选择匹配库存 --</option>
                      {inventory.map(bead => (
                        <option key={bead.id} value={bead.id}>
                          {bead.code} (库存: {bead.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    {!req.matchedBeadId ? (
                      <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md">待匹配</span>
                    ) : isInsufficient ? (
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-md">缺少 {req.count - (matchedBead?.quantity || 0)} 颗</span>
                    ) : (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">库存充足</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDeduct}
              disabled={isDeducting || requirements.some(r => !r.matchedBeadId)}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeducting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  处理中...
                </>
              ) : (
                '更新库存'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon component
const Trash2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

export default ProjectProcessor;
