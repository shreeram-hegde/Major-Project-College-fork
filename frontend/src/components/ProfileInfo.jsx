import React from "react";
import { getInitials } from "../utils/helper.js";

const ProfileInfo = ({ userInfo }) => {
  return (
    <div className="flex items-center gap-3">
      {userInfo ? (
        <>
          <div className="cursor-pointer w-12 h-12 flex items-center justify-center rounded-full text-slate-950 font-medium bg-slate-100 hover:bg-slate-200 transition-colors">
            {getInitials(userInfo.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate max-w-32">{userInfo.name}</p>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-700 rounded-full animate-pulse" />
          <div className="w-20 h-4 bg-slate-700 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default ProfileInfo;
