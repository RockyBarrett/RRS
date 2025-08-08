"use client";

import React from "react";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-6 bg-blue-600 text-white">
      {/* Logo placeholder */}
      <div className="text-2xl font-bold cursor-pointer select-none">
        Base44 Logo
      </div>

      {/* Action button */}
      <button
        onClick={() => alert("Button clicked!")}
        className="bg-white text-blue-600 font-semibold py-2 px-4 rounded hover:bg-gray-200 transition"
      >
        Get Started
      </button>
    </header>
  );
}