"use client";

import React from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <nav className="fixed w-full z-10 bg-gray-200/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-0"> {/* Remove left/right padding */}
        <div className="flex justify-between items-center h-16">
          {/* Logo flush to the left */}
          <img
            src="/logo.png"
            alt="Logo"
            className="w-14 h-auto ml-[-90]" // small left margin if needed
          />

          {/* Centered Desktop Links */}
          <div className="flex-1 flex justify-center space-x-20">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-500 text-3xl font-bold"
            >
              Home
            </Link>
            <Link
              href="/results"
              className="text-gray-700 hover:text-blue-500 text-3xl font-bold"
            >
              Results
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;