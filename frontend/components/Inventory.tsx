import React, { useState } from 'react';
import { Plus, Trash2, Search, ListPlus, Sparkles, CheckCircle2 } from 'lucide-react';
import { Bead } from '../types';
import { generateId, getTextColorForBackground } from '../utils';
import { initialBeads } from '../App';

interface InventoryProps {
  inventory: Bead[];
  setInventory: React.Dispatch<React.SetStateAction<Bead[]>>;
}

const NINETY_SIX_COLORS = [
  'A3', 'A4', 'A6', 'A7', 'A10', 'A11', 'A13', 'A14',
  'B3', 'B5', 'B7', 'B8', 'B10', 'B12', 'B14', 'B17', 'B18', 'B19', 'B20',
  'C2', 'C3', 'C5', 'C6', 'C7', 'C8', 'C10', 'C11', 'C13', 'C16',
  'D2', 'D3', 'D5', 'D6', 'D7', 'D8', 'D9', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D18', 'D19', 'D20', 'D21',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14',
  'G1', 'G2', 'G3', 'G5', 'G7', 'G8', 'G9', 'G13', 'G14', 'G17',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7',
  'M5', 'M6', 'M9', 'M12'
];

const Inventory: React.FC<InventoryProps> = ({ inventory, setInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  
  // Single Edit/Add State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBead, setEditingBead] = useState<Bead | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');
  const [quantity, setQuantity] = useState<number | ''>('');

  // Batch Selection State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBeadIds, setSelectedBeadIds] = useState<Set<string>>(new Set());
  const [isBatchAddModalOpen, setIsBatchAddModalOpen] = useState(false);
  const [batchAddQuantity, setBatchAddQuantity] = useState<number | ''>('');

  // Dynamically generate categories based on current inventory
  const allPrefixes = Array.from(new Set(inventory.map(b => {
    const match = b.code.match(/^[A-Z]+/i);
    return match ? match[0].toUpperCase() : '其他';
  }))).sort();
  
  const dynamicCategories = ['全部', ...allPrefixes];

  const filteredInventory = inventory.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === '全部' || b.code.startsWith(activeCategory);
    return matchesSearch && matchesCategory;
  });

  // Group by prefix
  const groupedInventory = filteredInventory.reduce((acc, bead) => {
    const match = bead.code.match(/^[A-Z]+/i);
    const prefix = match ? match[0].toUpperCase() : '其他';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(bead);
    return acc;
  }, {} as Record<string, Bead[]>);

  const sortedPrefixes = Object.keys(groupedInventory).sort((a, b) => a.localeCompare(b));

  const openModal = (bead?: Bead) => {
    if (bead) {
      setEditingBead(bead);
      setCode(bead.code);
      setName(bead.name);
      setHex(bead.hex);
      setQuantity(bead.quantity);
    } else {
      setEditingBead(null);
      setCode('');
      setName('');
      setHex('#000000');
      setQuantity('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBead(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || quantity === '') return;

    const newBead: Bead = {
      id: editingBead ? editingBead.id : generateId(),
      code,
      name,
      hex,
      quantity: Number(quantity)
    };

    if (editingBead) {
      setInventory(prev => prev.map(b => b.id === editingBead.id ? newBead : b));
    } else {
      setInventory(prev => [...prev, newBead]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个颜色吗？')) {
      setInventory(prev => prev.filter(b => b.id !== id));
      closeModal();
    }
  };

  const handleSetup96Colors = () => {
    // First, ensure all 96 colors exist in inventory
    setInventory(prev => {
      const newInv = [...prev];
      NINETY_SIX_COLORS.forEach(code => {
        if (!newInv.find(b => b.code === code)) {
          const defaultBead = initialBeads.find(b => b.code === code);
          newInv.push({
            id: generateId(),
            code: code,
            name: code,
            hex: defaultBead ? defaultBead.hex : '#CCCCCC',
            quantity: 0
          });
        }
      });
      return newInv;
    });

    // Then, select them and open batch mode
    setTimeout(() => {
      setInventory(currentInv => {
        const idsToSelect = new Set<string>();
        currentInv.forEach(b => {
          if (NINETY_SIX_COLORS.includes(b.code)) {
            idsToSelect.add(b.id);
          }
        });
        setSelectedBeadIds(idsToSelect);
        setIsBatchMode(true);
        return currentInv;
      });
    }, 0);
  };

  const toggleBeadSelection = (id: string) => {
    const newSet = new Set(selectedBeadIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBeadIds(newSet);
  };

  const handleBatchAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchAddQuantity === '' || batchAddQuantity <= 0) return;

    setInventory(prev => prev.map(b => {
      if (selectedBeadIds.has(b.id)) {
        return { ...b, quantity: b.quantity + Number(batchAddQuantity) };
      }
      return b;
    }));

    setIsBatchAddModalOpen(false);
    setIsBatchMode(false);
    setSelectedBeadIds(new Set());
    setBatchAddQuantity('');
  };

  // SVG Progress Bar Constants
  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="p-3 space-y-4 pb-24">
      {/* Top Actions */}
      {isBatchMode ? (
        <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl p-2 shadow-sm w-full animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-bold text-brand-700 pl-2">已选 {selectedBeadIds.size} 项</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setIsBatchMode(false); setSelectedBeadIds(new Set()); }}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform"
            >
              取消
            </button>
            <button
              onClick={() => setIsBatchAddModalOpen(true)}
              disabled={selectedBeadIds.size === 0}
              className="px-3 py-1.5 bg-brand-600 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:bg-gray-400 active:scale-95 transition-transform"
            >
              增加库存
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 animate-in fade-in">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索色号..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsBatchMode(true)}
            className="flex items-center justify-center px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
          >
            <ListPlus className="h-4 w-4 mr-1" />
            批量
          </button>
          <button
            onClick={handleSetup96Colors}
            className="flex items-center justify-center px-3 py-2 bg-brand-50 border border-brand-100 rounded-xl shadow-sm text-sm font-medium text-brand-700 hover:bg-brand-100 active:scale-95 transition-transform shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            96色
          </button>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex overflow-x-auto pb-1 -mx-3 px-3 gap-2 hide-scrollbar sticky top-0 bg-gray-50 z-10 py-1">
        {dynamicCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat === '全部' ? '全部' : `${cat} 系列`}
          </button>
        ))}
      </div>

      {/* Inventory Grid - Grouped by Prefix */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
          <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <div className="grid grid-cols-2 gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-300"></div>
            </div>
          </div>
          <h3 className="text-base font-medium text-gray-900">未找到拼豆</h3>
          <p className="mt-1 text-sm text-gray-500">没有符合当前筛选条件的颜色。</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedPrefixes.map(prefix => (
            <div key={prefix}>
              <h3 className="text-lg font-bold text-gray-800 mb-3 pl-1">{prefix} 系列</h3>
              {/* Highly compact adaptive grid for circular items */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-y-4 gap-x-2 sm:gap-x-3">
                {groupedInventory[prefix].map((bead) => {
                  const isSelected = selectedBeadIds.has(bead.id);
                  // Calculate progress percentage (assuming 1000 is a full bag)
                  const progressPercent = Math.min(100, (bead.quantity / 1000) * 100);
                  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
                  const textColor = getTextColorForBackground(bead.hex);
                  
                  return (
                    <button 
                      key={bead.id} 
                      onClick={() => isBatchMode ? toggleBeadSelection(bead.id) : openModal(bead)}
                      className="flex flex-col items-center justify-start active:scale-95 transition-transform w-full relative group outline-none"
                    >
                      {/* Circular Area */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                        {/* Progress Ring (SVG) */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                          {/* Background Track */}
                          <circle 
                            cx="22" cy="22" r={radius} 
                            fill="none" 
                            className="stroke-gray-200" 
                            strokeWidth="3" 
                          />
                          {/* Progress Indicator */}
                          <circle 
                            cx="22" cy="22" r={radius} 
                            fill="none" 
                            className={`transition-all duration-500 ${
                              bead.quantity === 0 ? 'stroke-transparent' :
                              bead.quantity < 200 ? 'stroke-red-400' : 
                              bead.quantity < 500 ? 'stroke-yellow-400' : 
                              'stroke-green-400'
                            }`}
                            strokeWidth="3" 
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Inner Color Circle */}
                        <div 
                          className={`absolute inset-[4px] rounded-full flex items-center justify-center shadow-sm border border-black/5 ${isBatchMode && isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
                          style={{ backgroundColor: bead.hex }}
                        >
                          <span 
                            className="font-bold text-sm sm:text-base tracking-tighter"
                            style={{ color: textColor }}
                          >
                            {bead.code}
                          </span>
                        </div>

                        {/* Batch Selection Overlay */}
                        {isBatchMode && isSelected && (
                          <div className="absolute inset-[4px] rounded-full bg-brand-500/30 flex items-center justify-center backdrop-blur-[1px]">
                            <CheckCircle2 className="h-6 w-6 text-brand-600 bg-white rounded-full shadow-sm" />
                          </div>
                        )}
                      </div>
                      
                      {/* Quantity Text Below */}
                      <div className="mt-1.5 flex flex-col items-center">
                        <span className={`font-bold leading-none ${bead.quantity === 0 ? 'text-red-500 text-sm' : 'text-gray-700 text-xs'}`}>
                          {bead.quantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) - Hidden in Batch Mode */}
      {!isBatchMode && (
        <button
          onClick={() => openModal()}
          className="fixed bottom-20 right-4 bg-brand-600 text-white p-3.5 rounded-full shadow-lg hover:bg-brand-700 active:scale-95 transition-transform z-20 flex items-center justify-center animate-in zoom-in"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-xl transform transition-all w-full sm:max-w-lg max-h-[90vh] flex flex-col z-40">
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto">
              <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                {editingBead ? '编辑颜色' : '添加新颜色'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">色号 (例如: A1, B2)</label>
                  <input type="text" required value={code} onChange={e => setCode(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-base uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">颜色名称</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-base" />
                </div>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">十六进制颜色</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input type="color" value={hex} onChange={e => setHex(e.target.value)} className="h-11 w-14 rounded-l-xl border border-r-0 border-gray-300 p-1 cursor-pointer" />
                      <input type="text" required value={hex} onChange={e => setHex(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" className="flex-1 block w-full border border-gray-300 rounded-r-xl py-2.5 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-base uppercase" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">数量</label>
                    <input type="number" required min="0" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-base" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {editingBead ? (
                <button type="button" onClick={() => handleDelete(editingBead.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              ) : <div></div>}
              <div className="flex space-x-3">
                <button type="button" onClick={closeModal} className="w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto">
                  取消
                </button>
                <button type="button" onClick={handleSave} className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Add Quantity Modal */}
      {isBatchAddModalOpen && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsBatchAddModalOpen(false)}></div>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-xl transform transition-all w-full sm:max-w-lg max-h-[90vh] flex flex-col z-40">
            <form onSubmit={handleBatchAddSubmit}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto">
                <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">
                  批量增加库存
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  将为已选的 <span className="font-bold text-brand-600">{selectedBeadIds.size}</span> 个色号统一增加以下数量：
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">增加数量</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    value={batchAddQuantity} 
                    onChange={e => setBatchAddQuantity(e.target.value === '' ? '' : Number(e.target.value))} 
                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-base" 
                    placeholder="输入要增加的数量"
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => setIsBatchAddModalOpen(false)} className="w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto">
                  取消
                </button>
                <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto">
                  确认增加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
