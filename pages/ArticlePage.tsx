
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { SPECIFIC_ARTICLES } from '../data/articles';

const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();

  // Check if we have specific content for this ID
  const specificArticle = id && SPECIFIC_ARTICLES[id];

  // Fallback generator for generic links (like 'contact', 'ideology' etc which are not yet fully implemented)
  const dummyParagraphs = Array.from({ length: 4 }).map((_, i) => {
    if (language === 'zh') {
        return `在这篇关于 ${t(id || '')} 的深入报道中，我们看到了集体主义精神的闪光。韩沐烨同志多次强调，任何脱离集体的个人奋斗都是无源之水。我们要深刻领会这一精神，将其贯彻到日常的学习和生活中去。${i === 2 ? '特别是在面对挑战时，更要发挥先锋模范作用。' : ''}`;
    }
    return `In this in-depth report concerning ${t(id || '')}, we witness the brilliance of the collectivist spirit. Steve Han has repeatedly emphasized that any individual struggle detached from the collective is like water without a source. We must deeply comprehend this spirit and implement it in our daily studies and lives. ${i === 2 ? 'Especially when facing challenges, we must exert our role as vanguards.' : ''}`;
  });

  return (
    <div className="mt-8 bg-white p-8 border border-gray-200 shadow-sm">
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex gap-2 text-sm text-[#888] mb-4">
            <Link to="/" className="hover:text-[#BE0000]">{t('nav_home')}</Link> 
            <span>&gt;</span>
            <span className="text-[#BE0000] font-bold">{t('nav_news')}</span>
        </div>
        
        <h1 className="text-3xl font-serif font-black text-[#333] mb-4 leading-tight">
          {specificArticle ? specificArticle.title[language] : t(id || 'news1')}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-[#666]">
            <span>{specificArticle ? specificArticle.date : '2025-11-20'}</span>
            <span>{t('section-header-1')}</span>
            <span>{t('quote_signature')}</span>
        </div>
      </div>

      <div className="article-content text-lg leading-relaxed text-[#444] space-y-6">
        {/* Editor's Note / Summary */}
        <p className="font-bold text-[#BE0000] p-4 bg-[#fff0f0] border-l-4 border-[#BE0000]">
            {language === 'zh' ? '【编者按】' : '[Editor\'s Note]'} {specificArticle ? specificArticle.editorNote[language] : t('headline-summary')}
        </p>
        
        {/* Content Rendering Logic */}
        {specificArticle ? (
            // Render Specific Content
            specificArticle.paragraphs.map((paraObj, idx) => (
                <p key={idx} className="indent-8 text-justify">
                    {paraObj[language]}
                </p>
            ))
        ) : (
            // Render Fallback Content
            <>
                {dummyParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                ))}
            </>
        )}

        {/* Pull Quote */}
        <div className="bg-gray-50 p-6 border-l-4 border-[#BE0000] my-8 shadow-inner">
            <p className="italic font-serif text-[#666] text-xl">
                {language === 'zh' 
                    ? "“我们不仅要追求学术上的卓越，更要追求精神上的崇高。每一个塞中青年，都应该成为一面旗帜。”"
                    : "“We must pursue not only academic excellence but also spiritual nobility. Every Semiahmoo youth should become a banner.”"}
            </p>
            <p className="text-right font-bold mt-2 text-[#BE0000] text-lg">{t('quote_signature')}</p>
        </div>

        {/* Extra filler for generic pages only */}
        {!specificArticle && dummyParagraphs.map((para, idx) => (
            <p key={`b-${idx}`}>{para}</p>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between">
         <Link to="/" className="px-6 py-2 bg-[#f5f5f5] text-[#666] hover:bg-[#BE0000] hover:text-white transition-colors rounded font-bold">
            &larr; {language === 'zh' ? '返回首页' : 'Back to Home'}
         </Link>
      </div>
    </div>
  );
};

export default ArticlePage;
