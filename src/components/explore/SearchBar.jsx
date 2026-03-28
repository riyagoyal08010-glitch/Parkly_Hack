import { useState } from 'react'
import { Search, Navigation, SlidersHorizontal, X, Crosshair } from 'lucide-react'
import { AMENITIES } from '../../lib/constants'

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  showFilters,
  setShowFilters,
  priceMax,
  setPriceMax,
  selectedAmenities,
  toggleAmenity,
  clearFilters,
  onLocateMe,
  activeFilterCount,
}) {
  return (
    <div className="w-full z-[1000]">
      <div className="backdrop-blur-2xl bg-[#111111]/90 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 p-2.5 transition-all duration-300">
        <form onSubmit={onSearch} className="flex items-center gap-2">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
            <input
              type="text"
              placeholder="Search or ask: cheap parking near mall..."
              className="w-full pl-11 pr-4 py-3.5 bg-white/10 border-0 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-gray-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Locate me */}
          <button
            type="button"
            onClick={onLocateMe}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 transition-all hover:scale-105 active:scale-95"
            title="Use my location"
          >
            <Crosshair className="w-[18px] h-[18px]" />
          </button>

          {/* Search button */}
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-3 bg-white text-black rounded-xl font-medium text-sm hover:bg-gray-200 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            {searching ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
              showFilters
                ? 'bg-white text-black border-white'
                : 'bg-white/10 border-white/10 hover:bg-white/15 text-gray-300'
            }`}
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in">
                {activeFilterCount}
              </span>
            )}
          </button>
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-2.5 pt-3 border-t border-white/10 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filters</h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>

            {/* Price slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500 font-medium">Max price per hour</label>
                <span className="text-sm font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-lg">₹{priceMax}</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full h-1.5 accent-black dark:accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>₹10</span>
                <span>₹500</span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-xs text-gray-500 font-medium mb-2 block">Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {AMENITIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                      selectedAmenities.includes(a)
                        ? 'bg-white text-black border-white font-medium'
                        : 'border-white/20 text-gray-400 hover:border-white/40'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
