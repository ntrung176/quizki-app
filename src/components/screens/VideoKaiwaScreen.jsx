import React from 'react';
import VideoKaiwaHub from '../kaiwa/VideoKaiwaHub';

const VideoKaiwaScreen = ({ profile, isAdmin, awardXP }) => {
    return (
        <div className="w-full h-[calc(100dvh-3.75rem)] lg:h-[100dvh] flex flex-col justify-start p-1 sm:p-2.5 bg-transparent text-slate-900 dark:text-slate-100 selection:bg-amber-500 selection:text-slate-950 overflow-y-auto box-border [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f8fafc] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <VideoKaiwaHub profile={profile} isAdmin={isAdmin} awardXP={awardXP} />
        </div>
    );
};

export default VideoKaiwaScreen;


