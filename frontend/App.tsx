import React, { useState, useEffect } from 'react';
import { Package, ImagePlus, Sparkles, Palette } from 'lucide-react';
import Inventory from './components/Inventory';
import ProjectProcessor from './components/ProjectProcessor';
import PatternCreator from './components/PatternCreator';
import { Bead, TabType } from './types';
import { getInventoryFromDB, saveInventoryToDB } from './db';

// 完整的拼豆色号数据 (已移除ZG系列)
export const initialBeads: Bead[] = [
  // A系列
  { id: 'A1', code: 'A1', name: 'A1', hex: '#FAF4C8', quantity: 0 },
  { id: 'A2', code: 'A2', name: 'A2', hex: '#FFFFD5', quantity: 0 },
  { id: 'A3', code: 'A3', name: 'A3', hex: '#FEFF8B', quantity: 0 },
  { id: 'A4', code: 'A4', name: 'A4', hex: '#FBED56', quantity: 0 },
  { id: 'A5', code: 'A5', name: 'A5', hex: '#F4D738', quantity: 0 },
  { id: 'A6', code: 'A6', name: 'A6', hex: '#FEAC4C', quantity: 0 },
  { id: 'A7', code: 'A7', name: 'A7', hex: '#FE8B4C', quantity: 0 },
  { id: 'A8', code: 'A8', name: 'A8', hex: '#FFDA45', quantity: 0 },
  { id: 'A9', code: 'A9', name: 'A9', hex: '#FF995B', quantity: 0 },
  { id: 'A10', code: 'A10', name: 'A10', hex: '#F77C31', quantity: 0 },
  { id: 'A11', code: 'A11', name: 'A11', hex: '#FFDD99', quantity: 0 },
  { id: 'A12', code: 'A12', name: 'A12', hex: '#FE9F72', quantity: 0 },
  { id: 'A13', code: 'A13', name: 'A13', hex: '#FFC365', quantity: 0 },
  { id: 'A14', code: 'A14', name: 'A14', hex: '#FD543D', quantity: 0 },
  { id: 'A15', code: 'A15', name: 'A15', hex: '#FFF365', quantity: 0 },
  { id: 'A16', code: 'A16', name: 'A16', hex: '#FFFF9F', quantity: 0 },
  { id: 'A17', code: 'A17', name: 'A17', hex: '#FFE36E', quantity: 0 },
  { id: 'A18', code: 'A18', name: 'A18', hex: '#FEBE7D', quantity: 0 },
  { id: 'A19', code: 'A19', name: 'A19', hex: '#FD7C72', quantity: 0 },
  { id: 'A20', code: 'A20', name: 'A20', hex: '#FFD568', quantity: 0 },
  { id: 'A21', code: 'A21', name: 'A21', hex: '#FFE395', quantity: 0 },
  { id: 'A22', code: 'A22', name: 'A22', hex: '#F4F57D', quantity: 0 },
  { id: 'A23', code: 'A23', name: 'A23', hex: '#E6C9B7', quantity: 0 },
  { id: 'A24', code: 'A24', name: 'A24', hex: '#F7F8A2', quantity: 0 },
  { id: 'A25', code: 'A25', name: 'A25', hex: '#FFD67D', quantity: 0 },
  { id: 'A26', code: 'A26', name: 'A26', hex: '#FFC830', quantity: 0 },

  // B系列
  { id: 'B1', code: 'B1', name: 'B1', hex: '#E6EE31', quantity: 0 },
  { id: 'B2', code: 'B2', name: 'B2', hex: '#63F347', quantity: 0 },
  { id: 'B3', code: 'B3', name: 'B3', hex: '#9EF780', quantity: 0 },
  { id: 'B4', code: 'B4', name: 'B4', hex: '#5DE035', quantity: 0 },
  { id: 'B5', code: 'B5', name: 'B5', hex: '#35E352', quantity: 0 },
  { id: 'B6', code: 'B6', name: 'B6', hex: '#65E2A6', quantity: 0 },
  { id: 'B7', code: 'B7', name: 'B7', hex: '#3DAF80', quantity: 0 },
  { id: 'B8', code: 'B8', name: 'B8', hex: '#1C9C4F', quantity: 0 },
  { id: 'B9', code: 'B9', name: 'B9', hex: '#27523A', quantity: 0 },
  { id: 'B10', code: 'B10', name: 'B10', hex: '#95D3C2', quantity: 0 },
  { id: 'B11', code: 'B11', name: 'B11', hex: '#5D722A', quantity: 0 },
  { id: 'B12', code: 'B12', name: 'B12', hex: '#166F41', quantity: 0 },
  { id: 'B13', code: 'B13', name: 'B13', hex: '#CAEB7B', quantity: 0 },
  { id: 'B14', code: 'B14', name: 'B14', hex: '#ADE946', quantity: 0 },
  { id: 'B15', code: 'B15', name: 'B15', hex: '#2E5132', quantity: 0 },
  { id: 'B16', code: 'B16', name: 'B16', hex: '#C5ED9C', quantity: 0 },
  { id: 'B17', code: 'B17', name: 'B17', hex: '#9BB13A', quantity: 0 },
  { id: 'B18', code: 'B18', name: 'B18', hex: '#E6EE49', quantity: 0 },
  { id: 'B19', code: 'B19', name: 'B19', hex: '#24B88C', quantity: 0 },
  { id: 'B20', code: 'B20', name: 'B20', hex: '#C2F0CC', quantity: 0 },
  { id: 'B21', code: 'B21', name: 'B21', hex: '#156A6B', quantity: 0 },
  { id: 'B22', code: 'B22', name: 'B22', hex: '#0B3C43', quantity: 0 },
  { id: 'B23', code: 'B23', name: 'B23', hex: '#303A21', quantity: 0 },
  { id: 'B24', code: 'B24', name: 'B24', hex: '#EEFCA5', quantity: 0 },
  { id: 'B25', code: 'B25', name: 'B25', hex: '#4E846D', quantity: 0 },
  { id: 'B26', code: 'B26', name: 'B26', hex: '#8D7A35', quantity: 0 },
  { id: 'B27', code: 'B27', name: 'B27', hex: '#CCE1AF', quantity: 0 },
  { id: 'B28', code: 'B28', name: 'B28', hex: '#9EE5B9', quantity: 0 },
  { id: 'B29', code: 'B29', name: 'B29', hex: '#C5E254', quantity: 0 },
  { id: 'B30', code: 'B30', name: 'B30', hex: '#E2FCB1', quantity: 0 },
  { id: 'B31', code: 'B31', name: 'B31', hex: '#B0E792', quantity: 0 },
  { id: 'B32', code: 'B32', name: 'B32', hex: '#9CAB5A', quantity: 0 },

  // C系列
  { id: 'C1', code: 'C1', name: 'C1', hex: '#E8FFE7', quantity: 0 },
  { id: 'C2', code: 'C2', name: 'C2', hex: '#A9F9FC', quantity: 0 },
  { id: 'C3', code: 'C3', name: 'C3', hex: '#A0E2FB', quantity: 0 },
  { id: 'C4', code: 'C4', name: 'C4', hex: '#41CCFF', quantity: 0 },
  { id: 'C5', code: 'C5', name: 'C5', hex: '#01ACEB', quantity: 0 },
  { id: 'C6', code: 'C6', name: 'C6', hex: '#50AAF0', quantity: 0 },
  { id: 'C7', code: 'C7', name: 'C7', hex: '#3677D2', quantity: 0 },
  { id: 'C8', code: 'C8', name: 'C8', hex: '#0F54C0', quantity: 0 },
  { id: 'C9', code: 'C9', name: 'C9', hex: '#324BCA', quantity: 0 },
  { id: 'C10', code: 'C10', name: 'C10', hex: '#3EBCE2', quantity: 0 },
  { id: 'C11', code: 'C11', name: 'C11', hex: '#28DDDE', quantity: 0 },
  { id: 'C12', code: 'C12', name: 'C12', hex: '#1C334D', quantity: 0 },
  { id: 'C13', code: 'C13', name: 'C13', hex: '#CDE8FF', quantity: 0 },
  { id: 'C14', code: 'C14', name: 'C14', hex: '#D5FDFF', quantity: 0 },
  { id: 'C15', code: 'C15', name: 'C15', hex: '#22C4C6', quantity: 0 },
  { id: 'C16', code: 'C16', name: 'C16', hex: '#1557A8', quantity: 0 },
  { id: 'C17', code: 'C17', name: 'C17', hex: '#04D1F6', quantity: 0 },
  { id: 'C18', code: 'C18', name: 'C18', hex: '#1D3344', quantity: 0 },
  { id: 'C19', code: 'C19', name: 'C19', hex: '#1887A2', quantity: 0 },
  { id: 'C20', code: 'C20', name: 'C20', hex: '#176DAF', quantity: 0 },
  { id: 'C21', code: 'C21', name: 'C21', hex: '#BEDDFF', quantity: 0 },
  { id: 'C22', code: 'C22', name: 'C22', hex: '#67B4BE', quantity: 0 },
  { id: 'C23', code: 'C23', name: 'C23', hex: '#C8E2FF', quantity: 0 },
  { id: 'C24', code: 'C24', name: 'C24', hex: '#7CC4FF', quantity: 0 },
  { id: 'C25', code: 'C25', name: 'C25', hex: '#A9E5E5', quantity: 0 },
  { id: 'C26', code: 'C26', name: 'C26', hex: '#3CAED8', quantity: 0 },
  { id: 'C27', code: 'C27', name: 'C27', hex: '#D3DFFA', quantity: 0 },
  { id: 'C28', code: 'C28', name: 'C28', hex: '#BBCFED', quantity: 0 },
  { id: 'C29', code: 'C29', name: 'C29', hex: '#34488E', quantity: 0 },

  // D系列
  { id: 'D1', code: 'D1', name: 'D1', hex: '#AEB4F2', quantity: 0 },
  { id: 'D2', code: 'D2', name: 'D2', hex: '#858EDD', quantity: 0 },
  { id: 'D3', code: 'D3', name: 'D3', hex: '#2F54AF', quantity: 0 },
  { id: 'D4', code: 'D4', name: 'D4', hex: '#182A84', quantity: 0 },
  { id: 'D5', code: 'D5', name: 'D5', hex: '#B843C5', quantity: 0 },
  { id: 'D6', code: 'D6', name: 'D6', hex: '#AC7BDE', quantity: 0 },
  { id: 'D7', code: 'D7', name: 'D7', hex: '#8854B3', quantity: 0 },
  { id: 'D8', code: 'D8', name: 'D8', hex: '#E2D3FF', quantity: 0 },
  { id: 'D9', code: 'D9', name: 'D9', hex: '#D5B9F8', quantity: 0 },
  { id: 'D10', code: 'D10', name: 'D10', hex: '#361B51', quantity: 0 },
  { id: 'D11', code: 'D11', name: 'D11', hex: '#B9BAE1', quantity: 0 },
  { id: 'D12', code: 'D12', name: 'D12', hex: '#DE9AD4', quantity: 0 },
  { id: 'D13', code: 'D13', name: 'D13', hex: '#B90095', quantity: 0 },
  { id: 'D14', code: 'D14', name: 'D14', hex: '#8B279B', quantity: 0 },
  { id: 'D15', code: 'D15', name: 'D15', hex: '#2F1F90', quantity: 0 },
  { id: 'D16', code: 'D16', name: 'D16', hex: '#E3E1EE', quantity: 0 },
  { id: 'D17', code: 'D17', name: 'D17', hex: '#C4D4F6', quantity: 0 },
  { id: 'D18', code: 'D18', name: 'D18', hex: '#A45EC7', quantity: 0 },
  { id: 'D19', code: 'D19', name: 'D19', hex: '#D8C3D7', quantity: 0 },
  { id: 'D20', code: 'D20', name: 'D20', hex: '#9C32B2', quantity: 0 },
  { id: 'D21', code: 'D21', name: 'D21', hex: '#9A009B', quantity: 0 },
  { id: 'D22', code: 'D22', name: 'D22', hex: '#333A95', quantity: 0 },
  { id: 'D23', code: 'D23', name: 'D23', hex: '#EBDAFC', quantity: 0 },
  { id: 'D24', code: 'D24', name: 'D24', hex: '#7786E5', quantity: 0 },
  { id: 'D25', code: 'D25', name: 'D25', hex: '#494FC7', quantity: 0 },
  { id: 'D26', code: 'D26', name: 'D26', hex: '#DFC2F8', quantity: 0 },

  // E系列
  { id: 'E1', code: 'E1', name: 'E1', hex: '#FDD3CC', quantity: 0 },
  { id: 'E2', code: 'E2', name: 'E2', hex: '#FEC0DF', quantity: 0 },
  { id: 'E3', code: 'E3', name: 'E3', hex: '#FFB7E7', quantity: 0 },
  { id: 'E4', code: 'E4', name: 'E4', hex: '#E8649E', quantity: 0 },
  { id: 'E5', code: 'E5', name: 'E5', hex: '#F551A2', quantity: 0 },
  { id: 'E6', code: 'E6', name: 'E6', hex: '#F13D74', quantity: 0 },
  { id: 'E7', code: 'E7', name: 'E7', hex: '#C63478', quantity: 0 },
  { id: 'E8', code: 'E8', name: 'E8', hex: '#FFDBE9', quantity: 0 },
  { id: 'E9', code: 'E9', name: 'E9', hex: '#E970CC', quantity: 0 },
  { id: 'E10', code: 'E10', name: 'E10', hex: '#D33793', quantity: 0 },
  { id: 'E11', code: 'E11', name: 'E11', hex: '#FCDDD2', quantity: 0 },
  { id: 'E12', code: 'E12', name: 'E12', hex: '#F78FC3', quantity: 0 },
  { id: 'E13', code: 'E13', name: 'E13', hex: '#B5006D', quantity: 0 },
  { id: 'E14', code: 'E14', name: 'E14', hex: '#FFD1BA', quantity: 0 },
  { id: 'E15', code: 'E15', name: 'E15', hex: '#F8C7C9', quantity: 0 },
  { id: 'E16', code: 'E16', name: 'E16', hex: '#FFF3EB', quantity: 0 },
  { id: 'E17', code: 'E17', name: 'E17', hex: '#FFE2EA', quantity: 0 },
  { id: 'E18', code: 'E18', name: 'E18', hex: '#FFC7DB', quantity: 0 },
  { id: 'E19', code: 'E19', name: 'E19', hex: '#FEBAD5', quantity: 0 },
  { id: 'E20', code: 'E20', name: 'E20', hex: '#D8C7D1', quantity: 0 },
  { id: 'E21', code: 'E21', name: 'E21', hex: '#BD9DA1', quantity: 0 },
  { id: 'E22', code: 'E22', name: 'E22', hex: '#B785A1', quantity: 0 },
  { id: 'E23', code: 'E23', name: 'E23', hex: '#937A8D', quantity: 0 },
  { id: 'E24', code: 'E24', name: 'E24', hex: '#E1BCE8', quantity: 0 },

  // F系列
  { id: 'F1', code: 'F1', name: 'F1', hex: '#FD957B', quantity: 0 },
  { id: 'F2', code: 'F2', name: 'F2', hex: '#FC3D46', quantity: 0 },
  { id: 'F3', code: 'F3', name: 'F3', hex: '#F74941', quantity: 0 },
  { id: 'F4', code: 'F4', name: 'F4', hex: '#FC283C', quantity: 0 },
  { id: 'F5', code: 'F5', name: 'F5', hex: '#E7002F', quantity: 0 },
  { id: 'F6', code: 'F6', name: 'F6', hex: '#943630', quantity: 0 },
  { id: 'F7', code: 'F7', name: 'F7', hex: '#971937', quantity: 0 },
  { id: 'F8', code: 'F8', name: 'F8', hex: '#BC0028', quantity: 0 },
  { id: 'F9', code: 'F9', name: 'F9', hex: '#E2677A', quantity: 0 },
  { id: 'F10', code: 'F10', name: 'F10', hex: '#8A4526', quantity: 0 },
  { id: 'F11', code: 'F11', name: 'F11', hex: '#5A2121', quantity: 0 },
  { id: 'F12', code: 'F12', name: 'F12', hex: '#FD4E6A', quantity: 0 },
  { id: 'F13', code: 'F13', name: 'F13', hex: '#F35744', quantity: 0 },
  { id: 'F14', code: 'F14', name: 'F14', hex: '#FFA9AD', quantity: 0 },
  { id: 'F15', code: 'F15', name: 'F15', hex: '#D30022', quantity: 0 },
  { id: 'F16', code: 'F16', name: 'F16', hex: '#FEC2A6', quantity: 0 },
  { id: 'F17', code: 'F17', name: 'F17', hex: '#E69C79', quantity: 0 },
  { id: 'F18', code: 'F18', name: 'F18', hex: '#D37C46', quantity: 0 },
  { id: 'F19', code: 'F19', name: 'F19', hex: '#C1444A', quantity: 0 },
  { id: 'F20', code: 'F20', name: 'F20', hex: '#CD9391', quantity: 0 },
  { id: 'F21', code: 'F21', name: 'F21', hex: '#F7B4C6', quantity: 0 },
  { id: 'F22', code: 'F22', name: 'F22', hex: '#FDC0D0', quantity: 0 },
  { id: 'F23', code: 'F23', name: 'F23', hex: '#F67E66', quantity: 0 },
  { id: 'F24', code: 'F24', name: 'F24', hex: '#E698AA', quantity: 0 },
  { id: 'F25', code: 'F25', name: 'F25', hex: '#E54B4F', quantity: 0 },

  // G系列
  { id: 'G1', code: 'G1', name: 'G1', hex: '#FFE2CE', quantity: 0 },
  { id: 'G2', code: 'G2', name: 'G2', hex: '#FFC4AA', quantity: 0 },
  { id: 'G3', code: 'G3', name: 'G3', hex: '#F4C3A5', quantity: 0 },
  { id: 'G4', code: 'G4', name: 'G4', hex: '#E1B383', quantity: 0 },
  { id: 'G5', code: 'G5', name: 'G5', hex: '#EDB045', quantity: 0 },
  { id: 'G6', code: 'G6', name: 'G6', hex: '#E99C17', quantity: 0 },
  { id: 'G7', code: 'G7', name: 'G7', hex: '#9D5B3E', quantity: 0 },
  { id: 'G8', code: 'G8', name: 'G8', hex: '#753B32', quantity: 0 },
  { id: 'G9', code: 'G9', name: 'G9', hex: '#E6B483', quantity: 0 },
  { id: 'G10', code: 'G10', name: 'G10', hex: '#D98C39', quantity: 0 },
  { id: 'G11', code: 'G11', name: 'G11', hex: '#E0C593', quantity: 0 },
  { id: 'G12', code: 'G12', name: 'G12', hex: '#FFC890', quantity: 0 },
  { id: 'G13', code: 'G13', name: 'G13', hex: '#B7714A', quantity: 0 },
  { id: 'G14', code: 'G14', name: 'G14', hex: '#8D614C', quantity: 0 },
  { id: 'G15', code: 'G15', name: 'G15', hex: '#FCF9E0', quantity: 0 },
  { id: 'G16', code: 'G16', name: 'G16', hex: '#F2D9BA', quantity: 0 },
  { id: 'G17', code: 'G17', name: 'G17', hex: '#7B524B', quantity: 0 },
  { id: 'G18', code: 'G18', name: 'G18', hex: '#FFE4CC', quantity: 0 },
  { id: 'G19', code: 'G19', name: 'G19', hex: '#E07935', quantity: 0 },
  { id: 'G20', code: 'G20', name: 'G20', hex: '#A94023', quantity: 0 },
  { id: 'G21', code: 'G21', name: 'G21', hex: '#B88558', quantity: 0 },

  // H系列
  { id: 'H1', code: 'H1', name: 'H1', hex: '#FDFBFF', quantity: 0 },
  { id: 'H2', code: 'H2', name: 'H2', hex: '#FFFFFF', quantity: 0 },
  { id: 'H3', code: 'H3', name: 'H3', hex: '#B6B1BA', quantity: 0 },
  { id: 'H4', code: 'H4', name: 'H4', hex: '#89858C', quantity: 0 },
  { id: 'H5', code: 'H5', name: 'H5', hex: '#48464E', quantity: 0 },
  { id: 'H6', code: 'H6', name: 'H6', hex: '#2F2B2F', quantity: 0 },
  { id: 'H7', code: 'H7', name: 'H7', hex: '#000000', quantity: 0 },
  { id: 'H8', code: 'H8', name: 'H8', hex: '#E7D6DB', quantity: 0 },
  { id: 'H9', code: 'H9', name: 'H9', hex: '#EDEDED', quantity: 0 },
  { id: 'H10', code: 'H10', name: 'H10', hex: '#EEE9EA', quantity: 0 },
  { id: 'H11', code: 'H11', name: 'H11', hex: '#CECDD5', quantity: 0 },
  { id: 'H12', code: 'H12', name: 'H12', hex: '#FFF5ED', quantity: 0 },
  { id: 'H13', code: 'H13', name: 'H13', hex: '#F5ECD2', quantity: 0 },
  { id: 'H14', code: 'H14', name: 'H14', hex: '#CFD7D3', quantity: 0 },
  { id: 'H15', code: 'H15', name: 'H15', hex: '#98A6A8', quantity: 0 },
  { id: 'H16', code: 'H16', name: 'H16', hex: '#1D1414', quantity: 0 },
  { id: 'H17', code: 'H17', name: 'H17', hex: '#F1EDED', quantity: 0 },
  { id: 'H18', code: 'H18', name: 'H18', hex: '#FFFDF0', quantity: 0 },
  { id: 'H19', code: 'H19', name: 'H19', hex: '#F6EFE2', quantity: 0 },
  { id: 'H20', code: 'H20', name: 'H20', hex: '#949FA3', quantity: 0 },
  { id: 'H21', code: 'H21', name: 'H21', hex: '#FFFBE1', quantity: 0 },
  { id: 'H22', code: 'H22', name: 'H22', hex: '#CACAD4', quantity: 0 },
  { id: 'H23', code: 'H23', name: 'H23', hex: '#9A9D94', quantity: 0 },

  // M系列
  { id: 'M1', code: 'M1', name: 'M1', hex: '#BCC6B8', quantity: 0 },
  { id: 'M2', code: 'M2', name: 'M2', hex: '#8AA386', quantity: 0 },
  { id: 'M3', code: 'M3', name: 'M3', hex: '#697D80', quantity: 0 },
  { id: 'M4', code: 'M4', name: 'M4', hex: '#E3D2BC', quantity: 0 },
  { id: 'M5', code: 'M5', name: 'M5', hex: '#D0CCAA', quantity: 0 },
  { id: 'M6', code: 'M6', name: 'M6', hex: '#B0A782', quantity: 0 },
  { id: 'M7', code: 'M7', name: 'M7', hex: '#B4A497', quantity: 0 },
  { id: 'M8', code: 'M8', name: 'M8', hex: '#B38281', quantity: 0 },
  { id: 'M9', code: 'M9', name: 'M9', hex: '#A58767', quantity: 0 },
  { id: 'M10', code: 'M10', name: 'M10', hex: '#C5B2BC', quantity: 0 },
  { id: 'M11', code: 'M11', name: 'M11', hex: '#9F7594', quantity: 0 },
  { id: 'M12', code: 'M12', name: 'M12', hex: '#644749', quantity: 0 },
  { id: 'M13', code: 'M13', name: 'M13', hex: '#D19066', quantity: 0 },
  { id: 'M14', code: 'M14', name: 'M14', hex: '#C77362', quantity: 0 },
  { id: 'M15', code: 'M15', name: 'M15', hex: '#757D7B', quantity: 0 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [inventory, setInventory] = useState<Bead[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load inventory from IndexedDB on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const saved = await getInventoryFromDB();
        if (saved && saved.length > 0) {
          setInventory(saved);
        } else {
          setInventory(initialBeads);
        }
      } catch (e) {
        console.error("Failed to load inventory from DB", e);
        setInventory(initialBeads);
      } finally {
        setIsLoaded(true);
      }
    };
    loadInventory();
  }, []);

  // Save inventory to IndexedDB whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveInventoryToDB(inventory).catch(e => console.error("Failed to save inventory to DB", e));
    }
  }, [inventory, isLoaded]);

  if (!isLoaded) return null;

  return (
    <div className="h-[100dvh] flex flex-col font-sans text-gray-800 bg-gray-50 overflow-hidden">
      {/* Header - Mobile Native Feel with Safe Area */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 flex items-center">
            <Sparkles className="h-5 w-5 text-brand-500 mr-1.5" />
            拼豆豆
          </h1>
        </div>
      </header>

      {/* Main Content - Scrollable Area */}
      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'inventory' && (
          <div className="animate-in fade-in duration-300 h-full">
            <Inventory inventory={inventory} setInventory={setInventory} />
          </div>
        )}
        {activeTab === 'project' && (
          <div className="animate-in fade-in duration-300 h-full">
            <ProjectProcessor inventory={inventory} setInventory={setInventory} />
          </div>
        )}
        {activeTab === 'create' && (
          <div className="animate-in fade-in duration-300 h-full">
            <PatternCreator inventory={inventory} />
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar with Safe Area */}
      <nav className="bg-white border-t border-gray-200 shrink-0 pb-[env(safe-area-inset-bottom)] z-20">
        <div className="flex justify-around items-center h-14">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              activeTab === 'inventory' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Package className="h-6 w-6" />
            <span className="text-[10px] mt-0.5 font-medium">库存</span>
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              activeTab === 'project' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px] mt-0.5 font-medium">图纸</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              activeTab === 'create' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Palette className="h-6 w-6" />
            <span className="text-[10px] mt-0.5 font-medium">创作</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
