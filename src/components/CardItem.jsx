import React, { memo } from 'react';
import { Volume2, Edit, Trash2, Clock, ImageIcon } from 'lucide-react';

/**
 * CardItem - Component để render một card trong grid view
 * Được sử dụng với VirtualizedGrid
 */
export const CardItem = memo(({
  card,
  onPlayAudio,
  onNavigateToEdit,
  onDeleteCard,
  getLevelColor
}) => {
  const levelColor = getLevelColor(card.level);
  const isDue = card.nextReview_back <= new Date().setHours(0, 0, 0, 0);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative group h-full">
      {/* Top colored bar */}
      <div className={`h-1.5 md:h-2 w-full ${levelColor.replace('bg-', 'bg-gradient-to-r from-').replace(' text-', ' to-white ')}`}></div>

      <div className="p-3 md:p-5 flex-grow">
        <div className="flex justify-between items-start mb-2 md:mb-3">
          <div className="flex flex-col gap-0.5 md:gap-1">
            {card.level ? (
              <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded border self-start ${levelColor}`}>
                {card.level}
              </span>
            ) : <span className="h-3 md:h-4"></span>}
          </div>
          {isDue && (
            <span className="text-red-500 bg-red-50 p-0.5 md:p-1 rounded-full" title="Cần ôn tập">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </span>
          )}
        </div>

        <h3 className="text-base md:text-xl font-bold text-gray-800 mb-0.5 md:mb-1 font-japanese">{card.front}</h3>
        {card.sinoVietnamese && <p className="text-[10px] md:text-xs font-medium text-pink-500 mb-1.5 md:mb-2">{card.sinoVietnamese}</p>}

        <div className="h-px bg-gray-100 w-full my-1.5 md:my-2"></div>

        <p className="text-xs md:text-sm text-gray-600 line-clamp-2" title={card.back}>{card.back}</p>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 flex justify-between items-center border-t border-gray-100">
        <button
          onClick={() => onPlayAudio(card.audioBase64, card.front)}
          className={`hover:bg-indigo-100 p-1 md:p-1.5 rounded-lg ${card.audioBase64 ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600'}`}
        >
          <Volume2 className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={() => onNavigateToEdit(card)}
            className="text-blue-500 hover:bg-blue-100 p-1 md:p-1.5 rounded-lg"
          >
            <Edit className="w-3 h-3 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => onDeleteCard(card.id, card.front)}
            className="text-red-500 hover:bg-red-100 p-1 md:p-1.5 rounded-lg"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

CardItem.displayName = 'CardItem';

