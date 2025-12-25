"use client";

import React, { useState, useEffect } from "react";
import { FaSearch, FaClock, FaTimes } from "react-icons/fa";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { getAllProduct } from "@/services/operations/product";
import { useDispatch } from "react-redux";
import { ProductFormValues } from "@/@types/product";
import { valideURLConvert } from "@/utils/valideURLConvert";
import Link from "next/link";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT_SEARCHES = 5;

const SearchBar = () => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ProductFormValues[]>(
    []
  );
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (error) {
          console.error("Failed to parse recent searches:", error);
        }
      }
    }
  }, []);

  // Save search to recent searches
  const addToRecentSearches = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    const updated = [
      searchTerm.trim(),
      ...recentSearches.filter((s) => s.toLowerCase() !== searchTerm.trim().toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }
  };

  // Remove from recent searches
  const removeRecentSearch = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== searchTerm);
    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }
  };

  // Backend search (debounced)
  useEffect(() => {
    const fetchResults = async () => {
      if (inputValue.trim() === "") {
        setFilteredProducts([]);
        return;
      }

      try {
        const results = await getAllProduct(dispatch, inputValue);
        setFilteredProducts(results || []);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    const debounce = setTimeout(fetchResults, 300); // 300ms debounce

    return () => clearTimeout(debounce);
  }, [inputValue]);

  return (
    <div className="relative w-full max-w-xl sm:max-w-2xl md:max-w-3xl">
      {/* Placeholder text animation */}
      {!inputValue && !isFocused && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none font-medium text-gray-800 text-sm sm:text-base flex items-center gap-1">
          <span>Search for</span>
          <TypingAnimation
            words={[
              "props",
              "premium décor",
              "event lights",
              "stage backdrops",
              "creative setups",
            ]}
            loop
          />
        </div>
      )}

      {/* Search Field */}
      <div className="flex items-center bg-white border border-gray-400/40 rounded-full px-4 py-2 sm:py-3 focus-within:border-indigo-400 transition-all duration-300">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowRecentSearches(true);
          }}
          onBlur={() => {
            // Delay to allow click events on recent searches
            setTimeout(() => {
              setIsFocused(false);
              setShowRecentSearches(false);
            }, 200);
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              addToRecentSearches(inputValue);
              const searchedProducts = await getAllProduct(dispatch, inputValue);
              setFilteredProducts(searchedProducts || []);
              setShowRecentSearches(false);
            }
          }}
          className="flex-1 bg-transparent outline-none font-medium text-gray-800 text-base px-2 placeholder-transparent"
        />
        <button
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#3a0103] text-white hover:bg-[#9c6567] transition-all duration-300"
          onClick={async () => {
            if (inputValue.trim()) {
              addToRecentSearches(inputValue);
              const searchedProducts = await getAllProduct(
                dispatch,
                inputValue
              );
              setFilteredProducts(searchedProducts);
            }
          }}
        >
          <FaSearch className="text-base sm:text-lg cursor-pointer" />
        </button>
      </div>

      {/* Recent Searches - Show when focused and input is empty */}
      {showRecentSearches && !inputValue && recentSearches.length > 0 && (
        <div 
          className="absolute z-50 w-full top-full left-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-96 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FaClock className="text-gray-500" />
              Recent Searches
            </h3>
          </div>
          <div className="py-1">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-all group"
                onClick={async () => {
                  setInputValue(search);
                  setIsFocused(true);
                  setShowRecentSearches(false);
                  // Trigger search automatically
                  const results = await getAllProduct(dispatch, search);
                  setFilteredProducts(results || []);
                  addToRecentSearches(search);
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <FaClock className="text-gray-400 text-sm" />
                  <span className="text-gray-800 text-sm sm:text-base">
                    {search}
                  </span>
                </div>
                <button
                  onClick={(e) => removeRecentSearch(search, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 rounded-full"
                  aria-label="Remove search"
                >
                  <FaTimes className="text-gray-500 text-xs" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Dropdown */}
      {filteredProducts.length > 0 && (
        <div className="absolute z-50 w-full top-full left-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-96 overflow-y-auto">
          {filteredProducts.map((product) => (
            <Link
              href={`/product/${valideURLConvert(product.name)}-${product._id}`}
              key={product._id}
            >
              <div
                // key={product._id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer transition-all"
              >
                <img
                  src={product.image[0]}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded-md"
                />
                <span className="text-gray-800 text-sm sm:text-base">
                  {product.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No results */}
      {inputValue && filteredProducts.length === 0 && !showRecentSearches && (
        <div className="absolute z-50 w-full top-full left-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg px-4 py-3 text-gray-500 text-sm text-center">
          No products found.
        </div>
      )}
    </div>
  );
};

export default SearchBar;
