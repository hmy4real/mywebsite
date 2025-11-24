import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import TabWidget from '../components/TabWidget';
import { QUOTES } from '../data/content';

const HomePage: React.FC = () => {
  const { t, language } = useLanguage();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES[language].length);
  };

  // Sync quote index if language changes roughly
  useEffect(() => {
    setQuoteIndex(0);
  }, [language]);

  const currentQuote = QUOTES[language][quoteIndex];

  return (
    <div className="mt-[20px] grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-[25px]">
      
      {/* Middle Column (Main Content) */}
      <div className="flex flex-col order-2 lg:order-1">
        
        {/* Directive Section Header */}
        <div className="border-l-[5px] border-[#BE0000] pl-[10px] text-[20px] font-black text-[#BE0000] mb-[15px] flex justify-between items-center">
          <span>{t('section-header-1')}</span>
          <Link to="/article/directive" className="text-[12px] text-[#999] font-normal hover:text-[#d00000]">
            {t('enter_topic')}
          </Link>
        </div>

        {/* Main Headline */}
        <Link to="/article/main-headline" className="font-serif text-[24px] md:text-[28px] font-black text-[#333] leading-[1.4] mb-[15px] hover:text-[#BE0000]">
          {t('main-headline-link')}
        </Link>
        
        <div className="text-[15px] text-[#333] mb-[20px] leading-relaxed">
           {t('headline-summary')}
        </div>

        {/* Visual & News Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px] mb-[25px] items-start">
          
          {/* Image Box */}
          <div className="h-[300px] bg-[#eee] border border-[#ddd] overflow-hidden relative group">
            <img 
              src="https://i.postimg.cc/fLvfm49f/semiahmooschool.jpg" 
              alt="Semiahmoo Campus" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute bottom-0 w-full bg-black/60 text-white p-[8px] font-bold text-[15px]">
              {t('focus_text_campus')}
            </div>
          </div>

          {/* Latest Reports List */}
          <div>
            <div className="text-[16px] font-black text-[#BE0000] mb-[5px] border-l-[3px] border-[#BE0000] pl-2">
              {t('section-header-2')}
            </div>
            <ul className="list-none mb-[25px]">
              {['news1', 'news2', 'news3'].map((key) => (
                <li key={key} className="py-[8px] border-b border-dashed border-[#ddd] text-[15px] relative pl-[15px] last:border-b-0 before:content-['•'] before:text-[#BE0000] before:absolute before:left-0 before:top-[8px]">
                  <Link to={`/article/${key}`} className="hover:text-[#d00000] hover:underline">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border border-[#e5e5e5] p-[10px] bg-white">
              <div className="text-[14px] font-black text-[#BE0000] mb-[5px] border-l-[3px] border-[#FFDE00] pl-2">
                {t('section-header-theory')}
              </div>
              <ul className="list-none">
                {['theory_link_1', 'theory_link_2'].map((key) => (
                  <li key={key} className="py-[5px] text-[13px] relative pl-[10px]">
                    <Link to={`/article/${key}`} className="hover:text-[#d00000] hover:underline">
                      - {t(key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Depth Observation */}
        <div className="border-l-[5px] border-[#BE0000] pl-[10px] text-[20px] font-black text-[#BE0000] mb-[15px]">
           {t('section-header-depth')}
        </div>
        <div className="text-[15px] leading-[1.8] text-[#444] text-left pb-[15px] border-b border-[#eee] mb-[25px]">
           {t('depth_para1')}
        </div>
        <div className="text-[15px] leading-[1.8] text-[#444] text-left pb-[15px] border-b border-[#eee] mb-[25px]">
           {t('depth_para2')}
        </div>

        {/* Academic Vanguards */}
        <div className="border-l-[5px] border-[#BE0000] pl-[10px] text-[20px] font-black text-[#BE0000] mb-[15px]">
           {t('section-header-4')}
        </div>
        <ul className="list-none mb-[25px]">
          {['news4', 'news5', 'news6', 'news7', 'news8'].map((key) => (
            <li key={key} className="py-[8px] border-b border-dashed border-[#ddd] text-[15px] relative pl-[15px] last:border-b-0 before:content-['•'] before:text-[#BE0000] before:absolute before:left-0 before:top-[8px]">
              <Link to={`/article/${key}`} className="hover:text-[#d00000] hover:underline">
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Discipline */}
        <div className="border-l-[5px] border-[#BE0000] pl-[10px] text-[20px] font-black text-[#BE0000] mb-[15px] flex justify-between items-center">
          <span>{t('section-header-6')}</span>
          <Link to="/article/discipline" className="text-[12px] text-[#999] font-normal hover:text-[#d00000]">
            {t('discipline_more')}
          </Link>
        </div>
        <ul className="list-none mb-[25px]">
          {['disc1', 'disc2', 'disc3', 'disc4', 'disc5'].map((key) => (
            <li key={key} className="py-[8px] border-b border-dashed border-[#ddd] text-[15px] relative pl-[15px] last:border-b-0 before:content-['•'] before:text-[#BE0000] before:absolute before:left-0 before:top-[8px]">
              <Link to={`/article/${key}`} className="text-[#8B0000] font-bold hover:text-[#d00000] hover:underline">
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Activities */}
        <div className="border-l-[5px] border-[#BE0000] pl-[10px] text-[20px] font-black text-[#BE0000] mb-[15px] flex justify-between items-center">
          <span>{t('section-header-5')}</span>
          <Link to="/article/activities" className="text-[12px] text-[#999] font-normal hover:text-[#d00000]">
            {t('more_activities')}
          </Link>
        </div>
        <ul className="list-none">
          {['act1', 'act2', 'act3', 'act4', 'act5', 'act6'].map((key) => (
            <li key={key} className="py-[8px] border-b border-dashed border-[#ddd] text-[15px] relative pl-[15px] last:border-b-0 before:content-['•'] before:text-[#BE0000] before:absolute before:left-0 before:top-[8px]">
              <Link to={`/article/${key}`} className="hover:text-[#d00000] hover:underline">
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>

      </div>

      {/* Right Column (Widgets) */}
      <div className="flex flex-col gap-[20px] order-1 lg:order-2 border-b-4 border-[#eee] pb-5 lg:border-none lg:pb-0">
        <TabWidget />
        
        <div className="bg-[#fff9f0] border border-[#ffe0b2] p-[20px] text-center relative">
          <div className="text-[12px] text-[#666] mb-[10px] uppercase font-bold text-left">{t('quote-header')}</div>
          <div className="font-serif text-[16px] text-[#b71c1c] italic mb-[15px]">
             <span dangerouslySetInnerHTML={{ __html: currentQuote }} />
          </div>
          <div className="text-[13px] text-[#8B0000] text-right font-bold mb-[10px]">
            {t('quote_signature')}
          </div>
          <button 
            onClick={nextQuote}
            className="bg-[#BE0000] text-white border-none py-[5px] px-[15px] mt-[5px] cursor-pointer text-[12px] rounded transition-transform active:scale-95 hover:bg-[#8B0000]"
          >
            {t('quote-button')}
          </button>
        </div>
      </div>

    </div>
  );
};

export default HomePage;