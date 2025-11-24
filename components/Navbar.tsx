import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { t, toggleLanguage, language } = useLanguage();

  const navItems = [
    { key: 'nav_home', to: '/' },
    { key: 'nav_directive', to: '/article/directive' },
    { key: 'nav_ideology', to: '/article/ideology' },
    { key: 'nav_news', to: '/article/news' },
    { key: 'nav_contact', to: '/article/contact' },
  ];

  return (
    <div className="bg-[#BE0000] h-[50px] shadow-md sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-[15px] flex justify-between items-center h-full overflow-x-auto no-scrollbar">
        <ul className="flex list-none h-full items-center">
          {navItems.map((item) => (
            <li key={item.key} className="h-full">
              <Link 
                to={item.to}
                className="text-white text-[16px] font-bold px-[15px] md:px-[25px] h-full flex items-center whitespace-nowrap hover:bg-[#8B0000] hover:text-[#FFDE00] transition-colors"
              >
                {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
        <button 
          onClick={toggleLanguage}
          className="ml-4 cursor-pointer py-[5px] px-[15px] border-none rounded bg-white font-sans-sc font-black text-[#BE0000] shadow transition-all hover:bg-[#FFDE00] hover:text-[#BE0000] whitespace-nowrap text-sm"
        >
          {language === 'zh' ? 'English' : '中文'}
        </button>
      </div>
    </div>
  );
};

export default Navbar;