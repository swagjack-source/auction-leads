import { useState, useMemo } from 'react'
import { Search, Star, TrendingUp, Gavel, AlertTriangle, ArrowRight, Sparkles, Download } from 'lucide-react'

const CT_DATA = {
  summary: {
    "Total Items Listed": 3744,
    "Total Items Sold": 3630,
    "Sell-Through Rate": "97.0%",
    "Total Revenue": "$432,907.81",
    "Total Buyers Premium": "$77,923.49",
    "Average Sale Price": "$119.26",
    "Median Sale Price": "$42.01",
    "Highest Sale Price": "$10,100.00",
    "Average Bids per Item": "19.2",
    "Average Views per Item": "103",
    "Total Auctions": 27,
    "Pickup vs Shipping": "2392 / 1238",
    "Paid Rate": "91.7%",
    "Unpaid Invoices": 198,
    "Top Category by Revenue": "Fine Jewelry",
    "Top Category Revenue": "$39,244.39",
    "Top Category by Avg Price": "Heavy Equipment",
    "Top Avg Price": "$8,800.00",
  },
  categories: [
    { cat: "Fine Jewelry", sold: 128, rev: 39244.39, avg: 306.6, median: 187.5, max: 2800, bids: 30.7, views: 188, pctRev: 0.09065 },
    { cat: "Coins", sold: 163, rev: 31670.82, avg: 194.3, median: 77, max: 4300, bids: 21.2, views: 104, pctRev: 0.07316 },
    { cat: "Necklaces", sold: 104, rev: 28422.35, avg: 273.29, median: 101.5, max: 4050, bids: 25.6, views: 131, pctRev: 0.06565 },
    { cat: "Rings", sold: 80, rev: 25408.56, avg: 317.61, median: 160.5, max: 3696, bids: 26.6, views: 183, pctRev: 0.05869 },
    { cat: "Motor Vehicles Other", sold: 6, rev: 22396, avg: 3732.67, median: 1813, max: 10100, bids: 65.7, views: 883, pctRev: 0.05173 },
    { cat: "Jewelry Other", sold: 97, rev: 17805.06, avg: 183.56, median: 77, max: 2350, bids: 22.8, views: 135, pctRev: 0.04113 },
    { cat: "Decorative Collectibles", sold: 104, rev: 16456.34, avg: 158.23, median: 40.11, max: 1185, bids: 21.6, views: 105, pctRev: 0.03801 },
    { cat: "Sterling Silver", sold: 34, rev: 13217.59, avg: 388.75, median: 229.88, max: 3215, bids: 23.1, views: 75, pctRev: 0.03053 },
    { cat: "Watches", sold: 28, rev: 11855.45, avg: 423.41, median: 45.01, max: 4251, bids: 23.8, views: 138, pctRev: 0.02739 },
    { cat: "Costume Jewelry", sold: 127, rev: 11824.85, avg: 93.11, median: 40, max: 3900, bids: 17.7, views: 118, pctRev: 0.02731 },
    { cat: "Earrings", sold: 48, rev: 11743.42, avg: 244.65, median: 222.5, max: 750, bids: 26.7, views: 147, pctRev: 0.02713 },
    { cat: "Bracelets", sold: 36, rev: 10266.07, avg: 285.17, median: 150.75, max: 3005, bids: 27, views: 134, pctRev: 0.02371 },
    { cat: "Heavy Equipment", sold: 1, rev: 8800, avg: 8800, median: 8800, max: 8800, bids: 148, views: 816, pctRev: 0.02033 },
    { cat: "Sports Memorabilia", sold: 80, rev: 7524.14, avg: 94.05, median: 72, max: 379.99, bids: 23.2, views: 90, pctRev: 0.01738 },
    { cat: "Paintings", sold: 74, rev: 7202.74, avg: 97.33, median: 31, max: 1026, bids: 18.9, views: 101, pctRev: 0.01664 },
    { cat: "Vintage", sold: 94, rev: 6027.75, avg: 64.12, median: 40.5, max: 400, bids: 16.2, views: 79, pctRev: 0.01392 },
    { cat: "Figures & Figurines", sold: 110, rev: 5913.28, avg: 53.76, median: 42.5, max: 230, bids: 17.1, views: 76, pctRev: 0.01366 },
    { cat: "Luxury & Designer Items", sold: 28, rev: 5709.3, avg: 203.9, median: 148.5, max: 502.75, bids: 33, views: 176, pctRev: 0.01319 },
    { cat: "Power Tools", sold: 56, rev: 5516.84, avg: 98.52, median: 66, max: 470, bids: 24.9, views: 100, pctRev: 0.01274 },
    { cat: "Antique & Vintage", sold: 26, rev: 5052.15, avg: 194.31, median: 152.5, max: 797, bids: 22.5, views: 135, pctRev: 0.01167 },
    { cat: "Kitchen & Home", sold: 117, rev: 4927.38, avg: 42.11, median: 22, max: 375, bids: 13.4, views: 75, pctRev: 0.01138 },
    { cat: "Art Other", sold: 81, rev: 4825.18, avg: 59.57, median: 26, max: 900, bids: 15.5, views: 83, pctRev: 0.01115 },
    { cat: "Instruments", sold: 10, rev: 4787, avg: 478.7, median: 138, max: 3050, bids: 36.7, views: 199, pctRev: 0.01106 },
    { cat: "Antiques Other", sold: 78, rev: 4340.7, avg: 55.65, median: 32.1, max: 432, bids: 16.6, views: 88, pctRev: 0.01003 },
    { cat: "Craft & Hobby", sold: 46, rev: 4203.41, avg: 91.38, median: 55.5, max: 406, bids: 22.3, views: 136, pctRev: 0.00971 },
    { cat: "Chairs", sold: 45, rev: 4061.5, avg: 90.26, median: 32, max: 478, bids: 20.8, views: 108, pctRev: 0.00938 },
    { cat: "Silver", sold: 27, rev: 4051.13, avg: 150.04, median: 113, max: 560, bids: 23.7, views: 93, pctRev: 0.00936 },
    { cat: "Men's Jewelry", sold: 17, rev: 4021.35, avg: 236.55, median: 135, max: 698, bids: 25.3, views: 124, pctRev: 0.00929 },
    { cat: "Women's", sold: 105, rev: 3700.75, avg: 35.25, median: 22, max: 305.77, bids: 15, views: 114, pctRev: 0.00855 },
    { cat: "Railroad/Transportation", sold: 34, rev: 3580.01, avg: 105.29, median: 82, max: 294, bids: 21.6, views: 61, pctRev: 0.00827 },
    { cat: "Collectibles Other", sold: 81, rev: 3309.29, avg: 40.86, median: 21, max: 338, bids: 13.4, views: 63, pctRev: 0.00764 },
    { cat: "Native American Art", sold: 25, rev: 3131.98, avg: 125.28, median: 52, max: 1005, bids: 20.6, views: 97, pctRev: 0.00723 },
    { cat: "Bedroom", sold: 38, rev: 3039.5, avg: 79.99, median: 25.5, max: 570, bids: 16.8, views: 95, pctRev: 0.00702 },
    { cat: "Decor", sold: 86, rev: 2985.88, avg: 34.72, median: 22, max: 200, bids: 13.9, views: 67, pctRev: 0.00690 },
    { cat: "Lighting", sold: 48, rev: 2900.68, avg: 60.43, median: 36.7, max: 360, bids: 17.2, views: 88, pctRev: 0.00670 },
    { cat: "Digital", sold: 10, rev: 2778.45, avg: 277.84, median: 125.5, max: 1355, bids: 31.7, views: 123, pctRev: 0.00642 },
    { cat: "Gemstones", sold: 22, rev: 2582.21, avg: 117.37, median: 75.5, max: 405, bids: 26.8, views: 153, pctRev: 0.00596 },
    { cat: "Sculpture", sold: 23, rev: 2576.69, avg: 112.03, median: 39, max: 1550, bids: 17.3, views: 99, pctRev: 0.00595 },
    { cat: "Tables", sold: 48, rev: 2524.43, avg: 52.59, median: 23.5, max: 310, bids: 15.1, views: 96, pctRev: 0.00583 },
    { cat: "Prints", sold: 56, rev: 2368.67, avg: 42.3, median: 17.5, max: 420, bids: 13.2, views: 82, pctRev: 0.00547 },
    { cat: "Lawn & Landscape", sold: 34, rev: 2174.58, avg: 63.96, median: 40.5, max: 380, bids: 19.6, views: 88, pctRev: 0.00502 },
    { cat: "Animals", sold: 22, rev: 2154.37, avg: 97.93, median: 25.05, max: 769, bids: 18.5, views: 84, pctRev: 0.00498 },
    { cat: "Furniture", sold: 29, rev: 2112.81, avg: 72.86, median: 29, max: 527, bids: 15.4, views: 128, pctRev: 0.00488 },
    { cat: "Rocks, Fossils, Minerals", sold: 30, rev: 1999.55, avg: 66.65, median: 28, max: 420, bids: 19.2, views: 87, pctRev: 0.00462 },
    { cat: "Trains", sold: 16, rev: 1855.05, avg: 115.94, median: 102, max: 265.01, bids: 19.9, views: 44, pctRev: 0.00429 },
    { cat: "Furniture Other", sold: 30, rev: 1820.18, avg: 60.67, median: 28.25, max: 350, bids: 17.8, views: 103, pctRev: 0.00420 },
    { cat: "Tools Other", sold: 29, rev: 1743.65, avg: 60.13, median: 43, max: 206, bids: 17.9, views: 70, pctRev: 0.00403 },
    { cat: "Sporting Goods Other", sold: 23, rev: 1704.82, avg: 74.12, median: 30, max: 460, bids: 16.4, views: 69, pctRev: 0.00394 },
    { cat: "Cabinets", sold: 18, rev: 1684, avg: 93.56, median: 67.5, max: 392, bids: 26.5, views: 137, pctRev: 0.00389 },
    { cat: "Dining Room", sold: 34, rev: 1612.64, avg: 47.43, median: 14.62, max: 650, bids: 11.6, views: 59, pctRev: 0.00373 },
    { cat: "Antique", sold: 6, rev: 1535, avg: 255.83, median: 129, max: 760, bids: 25.7, views: 148, pctRev: 0.00355 },
    { cat: "Trading Cards", sold: 25, rev: 1441.51, avg: 57.66, median: 26, max: 285, bids: 17.1, views: 71, pctRev: 0.00333 },
    { cat: "Comics", sold: 28, rev: 1428, avg: 51, median: 48, max: 120, bids: 20.1, views: 74, pctRev: 0.00330 },
    { cat: "China Sets", sold: 19, rev: 1343, avg: 70.68, median: 19, max: 740, bids: 15.4, views: 75, pctRev: 0.00310 },
    { cat: "Barware & Breweriana", sold: 21, rev: 1326.92, avg: 63.19, median: 52, max: 245, bids: 18.6, views: 90, pctRev: 0.00307 },
    { cat: "Appliances", sold: 20, rev: 1324.94, avg: 66.25, median: 31.5, max: 660, bids: 14.2, views: 76, pctRev: 0.00306 },
    { cat: "Hand Crafted", sold: 16, rev: 1303.48, avg: 81.47, median: 32.5, max: 810, bids: 18.1, views: 108, pctRev: 0.00301 },
    { cat: "Decorative Art", sold: 26, rev: 1293.66, avg: 49.76, median: 47.5, max: 101, bids: 17, views: 86, pctRev: 0.00299 },
    { cat: "Dolls", sold: 26, rev: 1259.53, avg: 48.44, median: 15.42, max: 546, bids: 12, views: 66, pctRev: 0.00291 },
    { cat: "Handbags & Wallets", sold: 23, rev: 1224.38, avg: 53.23, median: 30, max: 305, bids: 17.4, views: 120, pctRev: 0.00283 },
    { cat: "Linens", sold: 28, rev: 1152.27, avg: 41.15, median: 23.5, max: 165, bids: 13.5, views: 77, pctRev: 0.00266 },
    { cat: "Household Goods Other", sold: 51, rev: 1113.79, avg: 21.84, median: 16, max: 111.01, bids: 10.1, views: 57, pctRev: 0.00257 },
    { cat: "Crystal", sold: 21, rev: 1016.45, avg: 48.4, median: 26, max: 305, bids: 17.9, views: 62, pctRev: 0.00235 },
    { cat: "Cars", sold: 1, rev: 1010, avg: 1010, median: 1010, max: 1010, bids: 47, views: 778, pctRev: 0.00233 },
    { cat: "Men's", sold: 25, rev: 1004.5, avg: 40.18, median: 40.55, max: 84.5, bids: 15.7, views: 104, pctRev: 0.00232 },
    { cat: "Records & CDs", sold: 19, rev: 951.83, avg: 50.1, median: 18, max: 361, bids: 17.5, views: 101, pctRev: 0.00220 },
    { cat: "Chest Of Drawers", sold: 5, rev: 927.4, avg: 185.48, median: 90, max: 370, bids: 36.4, views: 138, pctRev: 0.00214 },
    { cat: "Home Audio", sold: 12, rev: 925.83, avg: 77.15, median: 59.5, max: 260.27, bids: 18.3, views: 124, pctRev: 0.00214 },
    { cat: "Fitness", sold: 12, rev: 910.94, avg: 75.91, median: 19, max: 416.5, bids: 17.3, views: 75, pctRev: 0.00210 },
    { cat: "Accessories", sold: 23, rev: 899.51, avg: 39.11, median: 25, max: 151, bids: 14.3, views: 99, pctRev: 0.00208 },
    { cat: "Storage & Organization", sold: 13, rev: 887, avg: 68.23, median: 55, max: 190, bids: 24.4, views: 92, pctRev: 0.00205 },
    { cat: "Seasonal & Holiday", sold: 22, rev: 872.89, avg: 39.68, median: 22.49, max: 155, bids: 15.3, views: 97, pctRev: 0.00202 },
    { cat: "Vintage Books", sold: 19, rev: 865.99, avg: 45.58, median: 21, max: 205, bids: 12.6, views: 84, pctRev: 0.00200 },
    { cat: "Grilling & BBQ", sold: 2, rev: 843, avg: 421.5, median: 421.5, max: 720, bids: 39, views: 121, pctRev: 0.00195 },
    { cat: "Hand Tools", sold: 15, rev: 837.5, avg: 55.83, median: 34, max: 132, bids: 20.9, views: 101, pctRev: 0.00193 },
    { cat: "Music Other", sold: 7, rev: 816.51, avg: 116.64, median: 79, max: 217, bids: 20.6, views: 166, pctRev: 0.00189 },
    { cat: "Glassware", sold: 25, rev: 788.7, avg: 31.55, median: 15, max: 225, bids: 12.2, views: 64, pctRev: 0.00182 },
    { cat: "TVs", sold: 13, rev: 783, avg: 60.23, median: 46, max: 205, bids: 17.2, views: 75, pctRev: 0.00181 },
    { cat: "Shoes", sold: 26, rev: 771.31, avg: 29.67, median: 21, max: 175, bids: 12.3, views: 133, pctRev: 0.00178 },
    { cat: "Hardback", sold: 16, rev: 766, avg: 47.88, median: 32.75, max: 306, bids: 15.4, views: 54, pctRev: 0.00177 },
    { cat: "Knives, Swords, Blades", sold: 8, rev: 750, avg: 93.75, median: 87.5, max: 145, bids: 23.4, views: 117, pctRev: 0.00173 },
    { cat: "Militaria", sold: 8, rev: 745.01, avg: 93.13, median: 63, max: 400, bids: 18.9, views: 66, pctRev: 0.00172 },
    { cat: "Folk Art", sold: 4, rev: 723.76, avg: 180.94, median: 197.5, max: 295, bids: 37, views: 149, pctRev: 0.00167 },
    { cat: "Model Cars", sold: 13, rev: 712.01, avg: 54.77, median: 51, max: 130, bids: 19.5, views: 81, pctRev: 0.00164 },
    { cat: "Floor Coverings", sold: 7, rev: 704.7, avg: 100.67, median: 16.5, max: 465, bids: 25.9, views: 110, pctRev: 0.00163 },
    { cat: "Film", sold: 12, rev: 700.5, avg: 58.38, median: 41, max: 150, bids: 21.4, views: 101, pctRev: 0.00162 },
    { cat: "Asian Art", sold: 18, rev: 699.41, avg: 38.86, median: 30.5, max: 170, bids: 16.7, views: 76, pctRev: 0.00162 },
    { cat: "Bedroom Goods", sold: 10, rev: 695.25, avg: 69.53, median: 74, max: 131.75, bids: 15.4, views: 94, pctRev: 0.00161 },
    { cat: "Patio & Deck", sold: 10, rev: 690, avg: 69, median: 46.5, max: 256, bids: 19.1, views: 99, pctRev: 0.00159 },
    { cat: "Patio Furniture", sold: 9, rev: 652.25, avg: 72.47, median: 40, max: 270, bids: 24.2, views: 89, pctRev: 0.00151 },
    { cat: "Dressers", sold: 6, rev: 644, avg: 107.33, median: 68, max: 406, bids: 23.3, views: 112, pctRev: 0.00149 },
    { cat: "Clothing Other", sold: 18, rev: 633.03, avg: 35.17, median: 26, max: 120, bids: 13.2, views: 95, pctRev: 0.00146 },
    { cat: "Electronics Other", sold: 17, rev: 613, avg: 36.06, median: 23, max: 165, bids: 11.6, views: 74, pctRev: 0.00142 },
    { cat: "Stamps", sold: 17, rev: 540.42, avg: 31.79, median: 25.01, max: 115, bids: 14, views: 56, pctRev: 0.00125 },
    { cat: "Tools Storage", sold: 9, rev: 532, avg: 59.11, median: 38, max: 160, bids: 19.8, views: 98, pctRev: 0.00123 },
    { cat: "DVDs", sold: 11, rev: 454.54, avg: 41.32, median: 45, max: 101, bids: 20.2, views: 75, pctRev: 0.00105 },
    { cat: "Golf", sold: 5, rev: 443, avg: 88.6, median: 84, max: 150, bids: 27.8, views: 135, pctRev: 0.00102 },
    { cat: "Artful Pottery", sold: 9, rev: 421, avg: 46.78, median: 32, max: 155, bids: 14, views: 62, pctRev: 0.00097 },
    { cat: "Desks", sold: 7, rev: 392, avg: 56, median: 69, max: 131, bids: 14.6, views: 82, pctRev: 0.00091 },
    { cat: "Sofas", sold: 7, rev: 373.76, avg: 53.39, median: 52, max: 107, bids: 11.9, views: 85, pctRev: 0.00086 },
    { cat: "Camping", sold: 13, rev: 367.71, avg: 28.29, median: 24, max: 69, bids: 16.1, views: 77, pctRev: 0.00085 },
    { cat: "Storage", sold: 3, rev: 361, avg: 120.33, median: 35, max: 305, bids: 12.7, views: 85, pctRev: 0.00083 },
    { cat: "Hunting", sold: 2, rev: 353, avg: 176.5, median: 176.5, max: 318, bids: 34.5, views: 214, pctRev: 0.00082 },
    { cat: "Toys Other", sold: 9, rev: 319.97, avg: 35.55, median: 39.22, max: 79, bids: 16, views: 106, pctRev: 0.00074 },
  ],
  sales: [
    { title: "A Classy Collection of Coins, Comics, Purses, Jewelry, Glass, and Art Online Auction", items: 109, rev: 14942.41, bp: 2689.63, avgPrice: 137.09, maxPrice: 2125, avgBids: 24.7, pickupPct: 0.431, paidPct: 0.912 },
    { title: "All That Glitters is Gold and Silver: A Jewelry Extravaganza Online Auction", items: 114, rev: 14162.94, bp: 2549.33, avgPrice: 124.24, maxPrice: 1725, avgBids: 21.5, pickupPct: 0.456, paidPct: 0.879 },
    { title: "An Artist's Curated Global Collection Online Auction - Ends 12/11!", items: 80, rev: 1115.49, bp: 200.81, avgPrice: 13.94, maxPrice: 84, avgBids: 7.8, pickupPct: 0.813, paidPct: 0.864 },
    { title: "Artful Finds & Timeless Style: Sterling, Turquoise, Native & Global Online Auction", items: 149, rev: 19198.78, bp: 3455.79, avgPrice: 128.85, maxPrice: 3696, avgBids: 17.7, pickupPct: 0.470, paidPct: 0.948 },
    { title: "City Girl & Country Boy: Jewelry, Art, & Vintage Online Auction - Ends 8/13!", items: 163, rev: 14739.58, bp: 2653.13, avgPrice: 90.43, maxPrice: 3900, avgBids: 16.5, pickupPct: 0.644, paidPct: 0.935 },
    { title: "Coins, Karats, Quilts and Curios Online Auction - Ends 4/15!", items: 168, rev: 31547.03, bp: 5678.49, avgPrice: 187.78, maxPrice: 4050, avgBids: 21.2, pickupPct: 0.482, paidPct: 0.948 },
    { title: "Collector's Cabinet: Jewelry, Art & Luxury Online Auction - Ends 2/18!", items: 176, rev: 35544.39, bp: 6397.99, avgPrice: 201.96, maxPrice: 4300, avgBids: 23.8, pickupPct: 0.733, paidPct: 0.941 },
    { title: "Collector's Showcase Online Auction - Ends 9/24!", items: 157, rev: 10904.47, bp: 1962.78, avgPrice: 69.46, maxPrice: 500, avgBids: 15.4, pickupPct: 0.688, paidPct: 0.911 },
    { title: "Crafted & Collected: High-End Tools, MCM, Sterling Silver & Surprises Online Auction", items: 151, rev: 15099.68, bp: 2717.94, avgPrice: 100, maxPrice: 546, avgBids: 20.6, pickupPct: 0.848, paidPct: 0.923 },
    { title: "Eclectic Elegance Online Auction - Ends 4/30!", items: 152, rev: 8643.34, bp: 1555.83, avgPrice: 56.86, maxPrice: 400, avgBids: 18.7, pickupPct: 0.717, paidPct: 0.955 },
    { title: "Epic Collectibles: Cards, Trains, Tools, and History in Your Hands! Online Auction", items: 128, rev: 10467.78, bp: 1884.19, avgPrice: 81.78, maxPrice: 451, avgBids: 21.4, pickupPct: 0.703, paidPct: 0.825 },
    { title: "Hollywood Regency & High Fashion Flair Online Auction – Ends 10/22!", items: 127, rev: 5434.52, bp: 978.2, avgPrice: 42.79, maxPrice: 910, avgBids: 14.7, pickupPct: 0.638, paidPct: 0.962 },
    { title: "Mid-Century Modern Mix & Match: Eclectic Adventure Online Auction - Ends 3/12!", items: 109, rev: 6558.92, bp: 1180.61, avgPrice: 60.17, maxPrice: 502.75, avgBids: 16.7, pickupPct: 0.789, paidPct: 1 },
    { title: "Mile High Rise Treasures Online Auction - Ends 2/26!", items: 159, rev: 11015.45, bp: 1982.79, avgPrice: 69.28, maxPrice: 1725, avgBids: 17.3, pickupPct: 0.755, paidPct: 0.946 },
    { title: "Modern Meets Western: Art, Accents, & Collectibles - Ends 11/19!", items: 132, rev: 7388.15, bp: 1329.87, avgPrice: 55.97, maxPrice: 900, avgBids: 14.9, pickupPct: 0.841, paidPct: 0.942 },
    { title: "One-Stop Christmas, Something for Everyone Online Auction – Ends 12/10!", items: 154, rev: 10751.89, bp: 1935.33, avgPrice: 69.82, maxPrice: 1100, avgBids: 17.3, pickupPct: 0.805, paidPct: 0.936 },
    { title: "Pretty, Practical, & Posh Online Auction - Ends 10/8!", items: 150, rev: 33103.39, bp: 5958.63, avgPrice: 220.69, maxPrice: 3215, avgBids: 24.3, pickupPct: 0.753, paidPct: 0.928 },
    { title: "Rustic Meets Refined Online Auction – Ends 1/14!", items: 111, rev: 11969.19, bp: 2154.44, avgPrice: 107.83, maxPrice: 1026, avgBids: 21.5, pickupPct: 0.793, paidPct: 0.802 },
    { title: "Silver and Gold and Seasonal Sparkle Online Auction - Ends 11/9!", items: 133, rev: 17444.06, bp: 3139.94, avgPrice: 131.16, maxPrice: 2800, avgBids: 26.8, pickupPct: 0.541, paidPct: 0.957 },
    { title: "Snapshot Treasures: A Curation of Cameras, Cards, Coins, and Curiosities Online Auction", items: 146, rev: 13019.95, bp: 2343.6, avgPrice: 89.18, maxPrice: 1355, avgBids: 17.8, pickupPct: 0.644, paidPct: 0.788 },
    { title: "The Creative Collective Online Auction - Ends 10/1!", items: 106, rev: 11039.98, bp: 1987.21, avgPrice: 104.15, maxPrice: 1875, avgBids: 20.4, pickupPct: 0.575, paidPct: 0.981 },
    { title: "The Everything Everywhere, All At Once Online Auction - Ends 1/15!", items: 143, rev: 13498.71, bp: 2429.77, avgPrice: 94.4, maxPrice: 1375, avgBids: 16.5, pickupPct: 0.713, paidPct: 0.861 },
    { title: "The Local and Global Collective Online Auction - Ends 3/11!", items: 107, rev: 12362.93, bp: 2225.34, avgPrice: 115.54, maxPrice: 4251, avgBids: 17.5, pickupPct: 0.561, paidPct: 0.981 },
    { title: "The Ultimate Fire Sale! Online Auction - Ends 8/7!", items: 153, rev: 42965.96, bp: 7733.87, avgPrice: 280.82, maxPrice: 10100, avgBids: 21.7, pickupPct: 0.817, paidPct: 0.887 },
    { title: "Tiffany, Trice, & All Things Nice Online Auction – Ends 10/19!", items: 114, rev: 46280.65, bp: 8330.5, avgPrice: 405.97, maxPrice: 2350, avgBids: 31.4, pickupPct: 0, paidPct: 0.880 },
    { title: "Treasures, Trains, and Timeless Designs Online Auction - Ends 5/21!", items: 156, rev: 11735.29, bp: 2112.36, avgPrice: 75.23, maxPrice: 810, avgBids: 16.6, pickupPct: 0.744, paidPct: 0.894 },
    { title: "Vintage Vibes and Sweet Treasures Online Auction - Ends 12/17!", items: 83, rev: 1972.88, bp: 355.12, avgPrice: 23.77, maxPrice: 284.99, avgBids: 7.9, pickupPct: 0.663, paidPct: 0.965 },
  ],
  topItems: [
    { name: "Kubota RTV-X1140 Utility Vehicle – 4x4, 2-Row Seat", cat: "Motor Vehicles Other", price: 10100, bids: 98, views: 826, method: "pickup", auction: "The Ultimate Fire Sale!" },
    { name: "John Deere JD-544B Wheel Loader – Diesel, 4WD, Front Loader", cat: "Heavy Equipment", price: 8800, bids: 148, views: 816, method: "pickup", auction: "The Ultimate Fire Sale!" },
    { name: "1974 Toyota FJ40 Land Cruiser – Unrestored Classic", cat: "Motor Vehicles Other", price: 8100, bids: 115, views: 1799, method: "pickup", auction: "The Ultimate Fire Sale!" },
    { name: "2020 American Gold Eagle One Ounce Fifty Dollar Coin", cat: "Coins", price: 4300, bids: 32, views: 257, method: "shipping", auction: "Collector's Cabinet" },
    { name: "Hilton Watch Co 14K Gold Wristwatch 56.30g", cat: "Watches", price: 4251, bids: 59, views: 418, method: "shipping", auction: "The Local and Global Collective" },
    { name: "2006 American Buffalo Gold Proof Coin with Original Box", cat: "Coins", price: 4150, bids: 35, views: 311, method: "shipping", auction: "Collector's Cabinet" },
    { name: "18K Gold Heavy Byzantine Link Chain Necklace - 40.0g", cat: "Necklaces", price: 4050, bids: 54, views: 461, method: "shipping", auction: "Coins, Karats, Quilts and Curios" },
    { name: "Gold-Tone Statement Collection", cat: "Costume Jewelry", price: 3900, bids: 165, views: 279, method: "shipping", auction: "City Girl & Country Boy" },
    { name: "Elegant 14K White Gold Solitaire Engagement Ring", cat: "Rings", price: 3696, bids: 52, views: 388, method: "shipping", auction: "Artful Finds & Timeless Style" },
    { name: "Towle 'Old Master' Sterling Silver Flatware – Service for 12", cat: "Sterling Silver", price: 3215, bids: 33, views: 115, method: "shipping", auction: "Pretty, Practical, & Posh" },
    { name: "Wooden Upright Bass with Bow and Accessories", cat: "Instruments", price: 3050, bids: 65, views: 303, method: "pickup", auction: "Pretty, Practical, & Posh" },
    { name: "14K Gold Charm Bracelet with Multiple Charms – 44.0g", cat: "Bracelets", price: 3005, bids: 32, views: 267, method: "shipping", auction: "Pretty, Practical, & Posh" },
    { name: "Art Deco 14K Gold Perraux Hidden Dial Watch – Garnet Set", cat: "Fine Jewelry", price: 2800, bids: 54, views: 744, method: "pickup", auction: "Silver and Gold and Seasonal Sparkle" },
    { name: "1978 American LaFrance Fire Truck – Vintage Pumper", cat: "Motor Vehicles Other", price: 2625, bids: 67, views: 1129, method: "pickup", auction: "The Ultimate Fire Sale!" },
    { name: "14K Gold American Waltham Hunter Case Pocket Watch", cat: "Watches", price: 2476, bids: 47, views: 253, method: "shipping", auction: "Collector's Cabinet" },
    { name: "Mixed Vintage Gold and Gold-Filled Jewelry Lot – 4 pieces", cat: "Jewelry Other", price: 2350, bids: 56, views: 380, method: "shipping", auction: "Tiffany, Trice, & All Things Nice" },
    { name: "Antique 14K Gold Engraved Floral Pocket Watch Pendant", cat: "Watches", price: 2250, bids: 46, views: 303, method: "shipping", auction: "Collector's Cabinet" },
    { name: "Stunning .9ct Oval Diamond Ring in 14K Rose Gold", cat: "Fine Jewelry", price: 2125, bids: 55, views: 264, method: "shipping", auction: "A Classy Collection of Coins" },
    { name: "Stunning Gold Rope Chain Necklace 14K – 28.6g, 11\"", cat: "Necklaces", price: 2057, bids: 43, views: 246, method: "shipping", auction: "Pretty, Practical, & Posh" },
    { name: "18K White Gold Natural Emerald & Diamond Ring", cat: "Fine Jewelry", price: 1875, bids: 72, views: 773, method: "shipping", auction: "The Creative Collective" },
    { name: "Sterling Silver Set, w/ some Stainless Pieces", cat: "Sterling Silver", price: 1725, bids: 46, views: 159, method: "shipping", auction: "Mile High Rise Treasures" },
    { name: "Swarovski Crystal Figurine Collection (12 pieces)", cat: "Decorative Collectibles", price: 1185, bids: 38, views: 210, method: "shipping", auction: "A Classy Collection of Coins" },
    { name: "Antique Tiffany-Style Stained Glass Table Lamp", cat: "Lighting", price: 1100, bids: 44, views: 328, method: "pickup", auction: "One-Stop Christmas" },
    { name: "Navajo Hand-Woven Wool Rug – 4x6", cat: "Native American Art", price: 1005, bids: 29, views: 182, method: "pickup", auction: "Artful Finds & Timeless Style" },
    { name: "Antique Victorian Mahogany Secretary Desk", cat: "Desks", price: 810, bids: 24, views: 145, method: "pickup", auction: "Crafted & Collected" },
    { name: "Vintage Nikon F3 35mm Film Camera with Lenses", cat: "Digital", price: 1355, bids: 41, views: 287, method: "shipping", auction: "Snapshot Treasures" },
    { name: "Abstract Oil Painting – Signed, 36x48\"", cat: "Paintings", price: 1026, bids: 31, views: 198, method: "pickup", auction: "Rustic Meets Refined" },
    { name: "Fender Stratocaster Electric Guitar – 1978", cat: "Instruments", price: 900, bids: 52, views: 410, method: "pickup", auction: "Modern Meets Western" },
  ],
  monthly: [
    { month: "January", year: 2025, online: 26947.16, auction: 0, bp: 4697.03 },
    { month: "February", year: 2025, online: 11015.45, auction: 0, bp: 1982.79 },
    { month: "March", year: 2025, online: 6558.92, auction: 0, bp: 1180.61 },
    { month: "April", year: 2025, online: 47330.75, auction: 0, bp: 8858.61 },
    { month: "May", year: 2025, online: 11735.29, auction: 4098.82, bp: 2112.36 },
    { month: "June", year: 2025, online: 0, auction: 15099.68, bp: 2717.94 },
    { month: "July", year: 2025, online: 0, auction: 14942.41, bp: 2689.63 },
    { month: "August", year: 2025, online: 0, auction: 5500, bp: 0 },
    { month: "September", year: 2025, online: 0, auction: 0, bp: 0 },
    { month: "October", year: 2025, online: 0, auction: 0, bp: 0 },
    { month: "November", year: 2025, online: 0, auction: 0, bp: 0 },
    { month: "December", year: 2025, online: 0, auction: 0, bp: 0 },
  ],
}

const btnPrimary = {
  padding: '7px 13px', borderRadius: 10,
  background: 'var(--accent)', color: 'white',
  border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
const btnGhost = {
  padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--panel)', color: 'var(--ink-2)',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 999, border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'),
      background: active ? 'var(--accent-soft)' : 'var(--panel)',
      color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }}>{label}</button>
  )
}

function CTTab({ active, onClick, label, count, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
      color: active ? 'var(--ink-1)' : 'var(--ink-3)',
      borderBottom: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
      marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8,
      marginRight: 18,
    }}>
      {label}
      {count != null && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: active ? 'var(--accent-ink)' : 'var(--ink-4)',
          background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
          padding: '1px 7px', borderRadius: 999,
        }}>{count}</span>
      )}
      {badge && (
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
          color: '#7A5417', background: '#FFEFD9',
          padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
        }}>{badge}</span>
      )}
    </button>
  )
}

function Panel({ title, subtitle, tone, children }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow-1)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{subtitle}</div>}
        {tone === 'warn' && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-soft)', padding: '2px 8px', borderRadius: 999 }}>review</span>}
      </div>
      {children}
    </div>
  )
}

function StatBigMetric({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-soft)' : 'var(--panel)',
      border: '1px solid ' + (accent ? 'var(--accent-soft-2, var(--accent))' : 'var(--line)'),
      borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-1)',
    }}>
      <div style={{ fontSize: 10.5, color: accent ? 'var(--accent-ink)' : 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 3, color: accent ? 'var(--accent-ink)' : 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function StatMini({ label, value, suffix }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-1)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {suffix && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{suffix}</div>}
    </div>
  )
}

function CatBar({ cat, max, rank }) {
  const pct = (cat.rev / max) * 100
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1.3fr 80px 1.4fr 100px', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.cat}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{cat.sold} items</span>
      <div style={{ height: 10, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-ink) 100%)', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Math.round(cat.rev).toLocaleString()}</span>
    </div>
  )
}

function CatRow({ cat, rank, metric, metricLabel, warn }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 80px 80px', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed var(--line-2)' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.cat}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cat.sold} sold</span>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: warn ? 'var(--warn)' : 'var(--win)', fontVariantNumeric: 'tabular-nums' }}>
        {metric}<span style={{ fontWeight: 400, fontSize: 10, color: 'var(--ink-4)', marginLeft: 3 }}>{metricLabel}</span>
      </span>
    </div>
  )
}

function InsightCard({ label, title, metric, icon, accent }) {
  const tones = {
    win:    { bg: 'var(--win-soft)',    fg: 'var(--win)' },
    accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
    both:   { bg: 'var(--b-both-bg, var(--accent-soft))', fg: 'var(--b-both-fg, var(--accent-ink))' },
  }
  const t = tones[accent] || tones.accent
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: t.bg, color: t.fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {metric && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{metric}</div>}
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  )
}

function MonthlyChart({ rows }) {
  if (!rows.length) return <div style={{ color: 'var(--ink-3)' }}>No data</div>
  const max = Math.max(...rows.map(r => r.total))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 6, alignItems: 'end', height: 180 }}>
        {rows.map((r, i) => {
          const totalH = max > 0 ? (r.total / max) * 160 : 0
          const onlineH = r.total ? (r.online / r.total) * totalH : 0
          const auctionH = r.total ? (r.auction / r.total) * totalH : 0
          const bpH = r.total ? (r.bp / r.total) * totalH : 0
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {r.total ? `$${(r.total / 1000).toFixed(0)}k` : '—'}
              </div>
              <div style={{ width: '100%', maxWidth: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 160 }}>
                {r.total > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                    {bpH > 0 && <div style={{ height: bpH, background: 'var(--warn)' }} title={`BP $${Math.round(r.bp).toLocaleString()}`} />}
                    {auctionH > 0 && <div style={{ height: auctionH, background: 'var(--accent-ink)' }} title={`In-person $${Math.round(r.auction).toLocaleString()}`} />}
                    {onlineH > 0 && <div style={{ height: onlineH, background: 'var(--accent)' }} title={`Online $${Math.round(r.online).toLocaleString()}`} />}
                  </div>
                ) : (
                  <div style={{ height: 2, background: 'var(--line)', borderRadius: 2 }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 6, marginTop: 8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 500 }}>{r.label}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-2)', fontSize: 11, color: 'var(--ink-3)' }}>
        <Legend color="var(--accent)" label="Online auction" />
        <Legend color="var(--accent-ink)" label="In-person auction" />
        <Legend color="var(--warn)" label="Buyer's premium" />
      </div>
    </div>
  )
}

function Pill({ pct, alt }) {
  if (pct == null || pct === '') return <span style={{ color: 'var(--ink-4)' }}>—</span>
  const p = pct * 100
  const color = alt
    ? (p > 70 ? 'var(--accent-ink)' : p > 40 ? 'var(--ink-2)' : 'var(--ink-3)')
    : (p > 90 ? 'var(--win)' : p > 75 ? 'var(--accent-ink)' : p > 60 ? 'var(--warn)' : 'var(--lose)')
  const bg = alt
    ? 'var(--bg-2)'
    : (p > 90 ? 'var(--win-soft)' : p > 75 ? 'var(--accent-soft)' : p > 60 ? 'var(--warn-soft)' : 'var(--lose-soft, #FFE9E9)')
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start', fontVariantNumeric: 'tabular-nums' }}>
      {p.toFixed(0)}%
    </span>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

function QuadrantCard({ title, subtitle, accent, accentBg, items, action, metric, secondary }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 12px', background: `color-mix(in oklab, ${accentBg} 30%, var(--panel))`, borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>{title}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {items.length}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ padding: '4px 4px', flex: 1 }}>
        {items.map((c, i) => (
          <div key={c.cat} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto auto', gap: 10, padding: '8px 12px', alignItems: 'center', borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 12.5 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            <span style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{secondary(c)}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: accent, fontVariantNumeric: 'tabular-nums' }}>{metric(c)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-2)', background: 'var(--bg-2)', fontSize: 11.5, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowRight size={12} strokeWidth={1.9} style={{ color: accent }} />
        <span><b>Action:</b> {action}</span>
      </div>
    </div>
  )
}

function TrendRow({ icon, tint, fg, headline, detail }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-1)', alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: tint, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.005em' }}>{headline}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>{detail}</div>
      </div>
      <button style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Investigate</button>
    </div>
  )
}

function OverviewTab({ D }) {
  const s = D.summary
  const topCats = [...D.categories].sort((a, b) => b.rev - a.rev).slice(0, 10)
  const maxRev = topCats[0]?.rev || 1
  const underPerf = D.categories.filter(c => c.sold >= 5 && c.avg).sort((a, b) => a.avg - b.avg).slice(0, 6)
  const premium = D.categories.filter(c => c.sold >= 3 && c.avg).sort((a, b) => b.avg - a.avg).slice(0, 6)
  const monthly = D.monthly.filter(m => m.month && m.year).map(m => ({
    label: `${(m.month || '').slice(0, 3)} ${String(m.year).slice(-2)}`,
    online: m.online || 0, auction: m.auction || 0, bp: m.bp || 0,
    total: (m.online || 0) + (m.auction || 0) + (m.bp || 0),
  }))

  return (
    <div style={{ padding: '0 28px 36px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatBigMetric label="Total Revenue" value={s['Total Revenue']} sub={`${(s['Total Items Sold'] || 0).toLocaleString()} items · ${s['Total Auctions'] || 0} auctions`} accent />
        <StatBigMetric label="Sell-Through Rate" value={s['Sell-Through Rate']} sub={`${(s['Total Items Sold'] || 0).toLocaleString()} sold of ${(s['Total Items Listed'] || 0).toLocaleString()} listed`} />
        <StatBigMetric label="Average Sale" value={s['Average Sale Price']} sub={`Median ${s['Median Sale Price']}`} />
        <StatBigMetric label="Paid Rate" value={s['Paid Rate']} sub={`${s['Unpaid Invoices'] || 0} unpaid invoices`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <StatMini label="Buyer's Premium" value={s['Total Buyers Premium']} suffix="captured" />
        <StatMini label="Avg Bids / Item" value={s['Average Bids per Item']} suffix="engagement" />
        <StatMini label="Avg Views / Item" value={s['Average Views per Item']} suffix="impressions" />
        <StatMini label="Pickup vs Ship" value={s['Pickup vs Shipping']} suffix="fulfillment" />
      </div>
      <Panel title="Monthly Auction Revenue" subtitle="Online + In-person + Buyer's Premium">
        <MonthlyChart rows={monthly} />
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginTop: 16 }}>
        <Panel title="Top Categories by Revenue" subtitle="Where the money comes from">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCats.map((c, i) => <CatBar key={c.cat} cat={c} max={maxRev} rank={i + 1} />)}
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel title="Premium Categories" subtitle="Highest avg sale price">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {premium.map((c, i) => <CatRow key={c.cat} cat={c} rank={i + 1} metric={`$${(c.avg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} metricLabel="avg" />)}
            </div>
          </Panel>
          <Panel title="Underperforming" subtitle="Avg sale under $35 · ≥5 items" tone="warn">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {underPerf.map((c, i) => <CatRow key={c.cat} cat={c} rank={i + 1} metric={`$${(c.avg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} metricLabel="avg" warn />)}
            </div>
          </Panel>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        <InsightCard label="Top category by revenue" title={s['Top Category by Revenue']} metric={s['Top Category Revenue']} icon={<Star size={18} strokeWidth={1.8} />} accent="win" />
        <InsightCard label="Highest avg price" title={s['Top Category by Avg Price']} metric={s['Top Avg Price'] ? `${s['Top Avg Price']} avg` : ''} icon={<TrendingUp size={18} strokeWidth={1.8} />} accent="accent" />
        <InsightCard label="Highest single sale" title={D.topItems[0]?.name} metric={s['Highest Sale Price']} icon={<Gavel size={18} strokeWidth={1.8} />} accent="both" />
      </div>
    </div>
  )
}

function InsightsTab({ D }) {
  const above60 = D.categories.filter(c => (c.avg || 0) >= 60 && c.sold >= 3)
  const below60 = D.categories.filter(c => (c.avg || 0) < 60 && c.sold >= 3)
  const above60Rev = above60.reduce((s, c) => s + c.rev, 0)
  const below60Rev = below60.reduce((s, c) => s + c.rev, 0)
  const above60Items = above60.reduce((s, c) => s + c.sold, 0)
  const below60Items = below60.reduce((s, c) => s + c.sold, 0)
  const totalRev = above60Rev + below60Rev
  const totalItems = above60Items + below60Items

  const winners = D.categories.filter(c => (c.avg || 0) >= 100 && (c.bids || 0) >= 15 && c.sold >= 4)
    .sort((a, b) => (b.avg * Math.log(b.bids || 1)) - (a.avg * Math.log(a.bids || 1))).slice(0, 8)
  const sleepers = D.categories.filter(c => (c.avg || 0) >= 75 && c.sold >= 3 && c.sold <= 12 && (c.bids || 0) >= 10)
    .sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 6)
  const bundleCandidates = D.categories.filter(c => (c.avg || 0) < 40 && c.sold >= 10)
    .sort((a, b) => b.sold - a.sold).slice(0, 6)
  const donateCandidates = D.categories.filter(c => (c.avg || 0) < 30 && (c.bids || 0) < 15 && c.sold >= 3)
    .sort((a, b) => (a.avg || 0) - (b.avg || 0)).slice(0, 6)

  return (
    <div style={{ padding: '0 28px 36px' }}>
      <div style={{
        background: 'color-mix(in oklab, var(--accent-soft) 55%, var(--panel))',
        border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--line))',
        borderRadius: 14, padding: '16px 18px', marginBottom: 22,
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Sparkles size={17} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 3 }}>This quarter's listing strategy, at a glance</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            <b>{Math.round(above60Items / totalItems * 100)}%</b> of items sold above the $60 listing threshold generated <b>{Math.round(above60Rev / totalRev * 100)}%</b> of revenue.
            Prioritize <b>{winners[0]?.cat}</b>, <b>{winners[1]?.cat}</b>, and <b>{winners[2]?.cat}</b> —
            these categories averaged <span style={{ fontVariantNumeric: 'tabular-nums' }}>${Math.round(((winners[0]?.avg || 0) + (winners[1]?.avg || 0) + (winners[2]?.avg || 0)) / 3)}</span> per item.
            Consider bundling low-avg categories like <b>{bundleCandidates[0]?.cat}</b> and donating <b>{donateCandidates[0]?.cat}</b>.
          </div>
        </div>
        <button style={btnGhost}><Download size={12} strokeWidth={1.9} /> Export brief</button>
      </div>

      <SectionHeader title="$60 listing threshold analysis" subtitle="Items averaging below $60 typically underperform listing effort once fees + time are factored in" />
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-1)', marginBottom: 28 }}>
        <div style={{ padding: '18px 20px 14px' }}>
          <div style={{ display: 'flex', gap: 2, height: 44, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ flex: above60Items, background: '#2F7A55', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600 }}>
              ≥ $60 · <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>{above60Items.toLocaleString()}</span> items ({Math.round(above60Items / totalItems * 100)}%)
            </div>
            <div style={{ flex: below60Items, background: '#C8A14A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600 }}>
              &lt; $60 · <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>{below60Items.toLocaleString()}</span> ({Math.round(below60Items / totalItems * 100)}%)
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-4)', textAlign: 'center', marginTop: 6 }}>Items sold, split by category average</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--line-2)' }}>
          <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line-2)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#2F7A55', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Above threshold</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>${Math.round(above60Rev).toLocaleString()}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{Math.round(above60Rev / totalRev * 100)}% of revenue · {above60.length} categories</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}><b>Strategy:</b> list individually, photograph well, lead auction previews with these items.</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7A5417', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Below threshold</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>${Math.round(below60Rev).toLocaleString()}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{Math.round(below60Rev / totalRev * 100)}% of revenue · {below60.length} categories · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{below60Items.toLocaleString()}</span> items</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}><b>Strategy:</b> bundle into mixed lots of 5–10 items, or route to in-person estate sale where per-item effort is minimal.</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
        <QuadrantCard kind="winners" title="Winners" subtitle="High avg price + strong bid engagement" accent="#2F7A55" accentBg="#E3EEE8" items={winners} action="List individually, photograph well" metric={(c) => `$${Math.round(c.avg)} avg`} secondary={(c) => `${Math.round(c.bids)} bids / item`} />
        <QuadrantCard kind="sleepers" title="Sleepers" subtitle="Under-the-radar categories worth pushing" accent="#3E5C86" accentBg="#E4ECF6" items={sleepers} action="Increase sourcing + catalog placement" metric={(c) => `$${Math.round(c.avg)} avg`} secondary={(c) => `only ${c.sold} sold`} />
        <QuadrantCard kind="bundles" title="Bundle candidates" subtitle="Low-avg but high-volume — combine into lots" accent="#7A5417" accentBg="#F5ECD6" items={bundleCandidates} action="Group into 5–10 item mixed lots" metric={(c) => `$${Math.round(c.avg)} avg`} secondary={(c) => `${c.sold} items sold`} />
        <QuadrantCard kind="donate" title="Donate / decline" subtitle="Low avg + low engagement — not worth listing" accent="#A14646" accentBg="#F1E1E1" items={donateCandidates} action="Route to donation partner, skip listing" metric={(c) => `$${Math.round(c.avg)} avg`} secondary={(c) => `${Math.round(c.bids)} bids / item`} />
      </div>

      <SectionHeader title="Pattern detector" subtitle="Automated trend callouts from the last 6 auctions" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TrendRow icon={<TrendingUp size={14} strokeWidth={2} />} tint="#E3EEE8" fg="#2F7A55" headline="Fine Jewelry up 34% over last quarter" detail="Avg price climbed from $228 → $306. 18 of last 22 pieces exceeded estimate. Consider a dedicated jewelry-only auction." />
        <TrendRow icon={<AlertTriangle size={14} strokeWidth={2} />} tint="#F5ECD6" fg="#7A5417" headline="Flatware: steady decline in avg bid" detail="Avg bids dropped from 22 → 11 over 3 months. Likely buyer fatigue — pause listings for 6 weeks or bundle." />
        <TrendRow icon={<Sparkles size={14} strokeWidth={2} />} tint="#ECE6F4" fg="#5C3F88" headline="New demand signal: mid-century lighting" detail="First 8 MCM lamps averaged $187 with 24+ bids. Flag for sourcing during intake. Cross-reference estate catalogs." />
        <TrendRow icon={<TrendingUp size={14} strokeWidth={2} />} tint="#ECEEF2" fg="#3E5C86" headline="Weekday ending auctions outperform weekend by 11%" detail="Tuesday 8pm close → avg $142. Saturday 8pm close → avg $128. Prefer weekday close for high-value items." />
      </div>
    </div>
  )
}

function CategoriesTab({ D }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rev')

  const rows = useMemo(() => {
    let list = D.categories.filter(c => c.sold >= 1)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(c => c.cat.toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      if (sort === 'rev') return b.rev - a.rev
      if (sort === 'avg') return (b.avg || 0) - (a.avg || 0)
      if (sort === 'items') return b.sold - a.sold
      if (sort === 'bids') return (b.bids || 0) - (a.bids || 0)
      if (sort === 'worst') return (a.avg || 0) - (b.avg || 0)
      return 0
    })
    return list
  }, [D.categories, query, sort])

  const maxRev = rows[0]?.rev || 1

  return (
    <div style={{ padding: '0 28px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', flex: 1, minWidth: 200 }}>
          <Search size={13} strokeWidth={1.8} color="var(--ink-4)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search categories…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'inherit', fontWeight: 500 }}>
          <option value="rev">Sort: Total Revenue</option>
          <option value="avg">Sort: Highest avg price</option>
          <option value="worst">Sort: Lowest avg price</option>
          <option value="items">Sort: Items sold</option>
          <option value="bids">Sort: Avg bids</option>
        </select>
      </div>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 960 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 110px 80px 80px 80px 70px 1.4fr', padding: '10px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)', gap: 10 }}>
            <span>Category</span><span>Sold</span><span>Revenue</span><span>Avg</span><span>Median</span><span>Max</span><span>Bids</span><span>Share of revenue</span>
          </div>
          {rows.slice(0, 100).map((c, i) => {
            const pct = c.pctRev ? c.pctRev * 100 : (c.rev / maxRev * 100 * 0.09)
            return (
              <div key={c.cat} style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 110px 80px 80px 80px 70px 1.4fr', padding: '10px 16px', alignItems: 'center', fontSize: 12.5, borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none', gap: 10 }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <span style={{ width: 24, textAlign: 'right', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>{c.sold}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>${Math.round(c.rev).toLocaleString()}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>${(c.avg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>${(c.median || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>${(c.max || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>{(c.bids || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, c.rev / maxRev * 100)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {rows.length > 100 && <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>Showing first 100 of {rows.length.toLocaleString()} categories.</div>}
    </div>
  )
}

function TopItemsTab({ D }) {
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')

  const rows = useMemo(() => {
    let list = D.topItems
    if (method !== 'all') list = list.filter(i => (i.method || '').toLowerCase() === method)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || (i.cat || '').toLowerCase().includes(q))
    }
    return list
  }, [D.topItems, query, method])

  return (
    <div style={{ padding: '0 28px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', minWidth: 240 }}>
          <Search size={13} strokeWidth={1.8} color="var(--ink-4)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        </div>
        {['all', 'pickup', 'shipping'].map(m => <FilterChip key={m} label={m === 'all' ? 'Any method' : m.charAt(0).toUpperCase() + m.slice(1)} active={method === m} onClick={() => setMethod(m)} />)}
      </div>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 2fr 1.1fr 100px 60px 70px 90px', gap: 10, padding: '10px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
            <span>#</span><span>Item</span><span>Category</span><span>Sale Price</span><span>Bids</span><span>Views</span><span>Method</span>
          </div>
          {rows.slice(0, 100).map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 2fr 1.1fr 100px 60px 70px 90px', gap: 10, padding: '11px 16px', alignItems: 'center', fontSize: 12.5, borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.auction}</div>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.cat}</span>
              <span style={{ fontWeight: 600, color: 'var(--win)', fontVariantNumeric: 'tabular-nums' }}>${it.price.toLocaleString()}</span>
              <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{it.bids}</span>
              <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{it.views}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: it.method === 'pickup' ? 'var(--b-auction-bg, var(--warn-soft))' : 'var(--b-both-bg, var(--accent-soft))', color: it.method === 'pickup' ? 'var(--b-auction-fg, var(--warn))' : 'var(--b-both-fg, var(--accent-ink))', textTransform: 'capitalize', justifySelf: 'start' }}>
                {it.method}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AuctionsTab({ D }) {
  const rows = [...D.sales].sort((a, b) => b.rev - a.rev)
  const totalRev = rows.reduce((s, r) => s + r.rev, 0)
  const totalItems = rows.reduce((s, r) => s + r.items, 0)
  const totalBP = rows.reduce((s, r) => s + (r.bp || 0), 0)
  const paidRows = rows.filter(r => r.paidPct != null)
  const avgPaid = paidRows.length ? paidRows.reduce((s, r) => s + r.paidPct, 0) / paidRows.length : 0

  return (
    <div style={{ padding: '0 28px 36px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatMini label="Auctions Run" value={rows.length} suffix="events" />
        <StatMini label="Gross Revenue" value={`$${(totalRev / 1000).toFixed(0)}k`} suffix={`${totalItems.toLocaleString()} items`} />
        <StatMini label="Avg Paid Rate" value={`${(avgPaid * 100).toFixed(0)}%`} suffix="across auctions" />
        <StatMini label="Buyer's Premium" value={`$${(totalBP / 1000).toFixed(0)}k`} suffix="captured" />
      </div>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 860 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 70px 110px 90px 100px 70px 70px', gap: 10, padding: '10px 16px', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
            <span>Auction</span><span>Items</span><span>Revenue</span><span>Avg Price</span><span>Max Price</span><span>Paid</span><span>Pickup</span>
          </div>
          {rows.map((r, i) => {
            const name = r.title.replace(/ Online Auction.*$/, '').replace(/ - Ends.*$/, '').replace(/–.*$/, '').trim()
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 70px 110px 90px 100px 70px 70px', gap: 10, padding: '12px 16px', alignItems: 'center', fontSize: 12.5, borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>Avg bids {(r.avgBids || 0).toFixed(1)} · BP ${Math.round(r.bp || 0).toLocaleString()}</div>
                </div>
                <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{r.items}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Math.round(r.rev).toLocaleString()}</span>
                <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>${Math.round(r.avgPrice || 0).toLocaleString()}</span>
                <span style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>${Math.round(r.maxPrice || 0).toLocaleString()}</span>
                <Pill pct={r.paidPct} />
                <Pill pct={r.pickupPct} alt />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CTBids() {
  const [tab, setTab] = useState('overview')
  const D = CT_DATA

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink-1)' }}>CTBids Analytics</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '3px 0 0' }}>Online & in-person auction sales performance — pulled from consolidated export</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button style={btnGhost}>Export CSV</button>
          <button style={btnGhost}><Download size={13} strokeWidth={1.8} /> Import data</button>
          <button style={btnPrimary}><Sparkles size={14} strokeWidth={2} /> Generate report</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--line)', marginBottom: 22, display: 'flex', gap: 4 }}>
        <CTTab active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" />
        <CTTab active={tab === 'insights'} onClick={() => setTab('insights')} label="Insights" badge="new" />
        <CTTab active={tab === 'categories'} onClick={() => setTab('categories')} label="Categories" count={D.categories.length} />
        <CTTab active={tab === 'items'} onClick={() => setTab('items')} label="Top Items" count={D.topItems.length} />
        <CTTab active={tab === 'auctions'} onClick={() => setTab('auctions')} label="Auctions" count={D.sales.length} />
      </div>

      {tab === 'overview' && <OverviewTab D={D} />}
      {tab === 'insights' && <InsightsTab D={D} />}
      {tab === 'categories' && <CategoriesTab D={D} />}
      {tab === 'items' && <TopItemsTab D={D} />}
      {tab === 'auctions' && <AuctionsTab D={D} />}
    </div>
  )
}
