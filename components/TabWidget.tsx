import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const TabWidget: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');

  const tab1Items = ['tab1-1', 'tab1-2', 'tab1-3', 'tab1-4', 'tab1-5'];
  const tab2Items = ['tab2-1', 'tab2-2', 'tab2-3', 'tab2-4', 'tab2-5'];

  return (
    <div className="border border-[#e5e5e5] bg-white">
      <div className="flex border-b border-[#e5e5e5]">
        <button
          onClick={() => setActiveTab('tab1')}
          className={`flex-1 py-[10px] text-center font-bold cursor-pointer transition-all border-r border-[#e5e5e5]
            ${activeTab === 'tab1' ? 'bg-white text-[#BE0000] border-b-[3px] border-b-[#BE0000] -mb-[2px]' : 'bg-[#eee] text-[#333]'}`}
        >
          {t('tab-header-1')}
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          className={`flex-1 py-[10px] text-center font-bold cursor-pointer transition-all border-r border-[#e5e5e5]
            ${activeTab === 'tab2' ? 'bg-white text-[#BE0000] border-b-[3px] border-b-[#BE0000] -mb-[2px]' : 'bg-[#eee] text-[#333]'}`}
        >
          {t('tab-header-2')}
        </button>
      </div>
      <div className="p-[10px]">
        <ul className="list-none">
          {(activeTab === 'tab1' ? tab1Items : tab2Items).map((key) => (
            <li key={key} className="py-[8px] border-b border-dashed border-[#ddd] text-[15px] relative pl-[15px] last:border-b-0 before:content-['•'] before:text-[#BE0000] before:absolute before:left-0 before:top-[8px]">
               <Link to={`/article/${key}`} className="hover:text-[#d00000] hover:underline">
                  {t(key)}
               </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TabWidget;