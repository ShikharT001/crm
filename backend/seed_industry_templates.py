"""
Module 2 Seed Script: Industry Templates & Predefined Product Field Systems
Populates 12 rich industry templates with categories, subcategories, fields, field types, and option lists.
Run with: python seed_industry_templates.py
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app.models import IndustryTemplate, TemplateField, TemplateCategory

TEMPLATES_DATA = [
    # 1. CLOTHING / FASHION
    {
        "name": "Clothing / Fashion",
        "code": "clothing",
        "description": "Pre-configured template for fashion, apparel, footwear, and accessories",
        "icon": "Shirt",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Men", "children": ["Shirts", "T-Shirts", "Jeans", "Trousers", "Suits & Blazers"]},
            {"name": "Women", "children": ["Dresses", "Tops & Tees", "Sarees & Kurtis", "Jeans & Trousers", "Skirts"]},
            {"name": "Kids", "children": ["Boys Wear", "Girls Wear", "Baby Care"]},
            {"name": "Accessories", "children": ["Belts & Wallets", "Caps & Hats", "Sunglasses"]}
        ],
        "fields": [
            {"name": "brand", "label": "Brand", "field_type": "SELECT", "filterable": True, "searchable": True, "sortable": True, "display_order": 1, "options": ["Nike", "Adidas", "Zara", "H&M", "Levi's", "Puma", "Gucci", "Uniqlo"]},
            {"name": "clothing_type", "label": "Clothing Type", "field_type": "SELECT", "filterable": True, "display_order": 2, "options": ["Topwear", "Bottomwear", "Ethnic Wear", "Outerwear", "Activewear", "Innerwear"]},
            {"name": "gender", "label": "Gender", "field_type": "SELECT", "filterable": True, "display_order": 3, "options": ["Men", "Women", "Kids", "Unisex"]},
            {"name": "size", "label": "Size Options", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 4, "options": ["XS", "S", "M", "L", "XL", "XXL", "3XL"]},
            {"name": "color", "label": "Color Options", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 5, "options": ["Black", "White", "Red", "Blue", "Navy", "Green", "Yellow", "Grey", "Pink", "Beige"]},
            {"name": "fabric", "label": "Fabric Type", "field_type": "SELECT", "filterable": True, "display_order": 6, "options": ["Cotton", "Linen", "Polyester", "Denim", "Silk", "Rayon", "Wool", "Nylon", "Cotton Blend"]},
            {"name": "fit", "label": "Fit Type", "field_type": "SELECT", "filterable": True, "display_order": 7, "options": ["Regular Fit", "Slim Fit", "Oversized Fit", "Relaxed Fit", "Skinny Fit", "Tailored Fit"]},
            {"name": "pattern", "label": "Pattern & Design", "field_type": "SELECT", "filterable": True, "display_order": 8, "options": ["Plain", "Printed", "Striped", "Checked", "Floral", "Graphic", "Solid"]},
            {"name": "sleeve_type", "label": "Sleeve Length", "field_type": "SELECT", "display_order": 9, "options": ["Full Sleeve", "Half Sleeve", "Sleeveless", "3/4th Sleeve"]},
            {"name": "neck_type", "label": "Neck Type", "field_type": "SELECT", "display_order": 10, "options": ["Round Neck", "V-Neck", "Polo Collar", "Turtleneck", "Hooded"]},
            {"name": "season", "label": "Target Season", "field_type": "SELECT", "filterable": True, "display_order": 11, "options": ["Summer", "Winter", "Spring", "Autumn", "All Season"]},
            {"name": "collection", "label": "Collection Name", "field_type": "TEXT", "searchable": True, "display_order": 12}
        ]
    },

    # 2. SOFTWARE / SAAS
    {
        "name": "Software / SaaS",
        "code": "software",
        "description": "Pre-configured template for software products, cloud SaaS subscriptions, and APIs",
        "icon": "Code",
        "product_type_default": "SUBSCRIPTION",
        "categories": [
            {"name": "CRM & Sales", "children": ["Sales Pipeline", "Lead Scoring", "Contact Management"]},
            {"name": "Accounting & Finance", "children": ["Invoicing", "Taxation", "Payroll"]},
            {"name": "Security & IT", "children": ["Antivirus", "VPN", "IAM & Auth"]},
            {"name": "Developer Tools", "children": ["APIs & SDKs", "CI/CD Pipeline", "Cloud Hosting"]}
        ],
        "fields": [
            {"name": "version", "label": "Software Version", "field_type": "TEXT", "searchable": True, "display_order": 1},
            {"name": "platform", "label": "Supported Platforms", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 2, "options": ["Web Browser", "Windows OS", "macOS", "Linux", "iOS App", "Android App"]},
            {"name": "license_type", "label": "License Model", "field_type": "SELECT", "filterable": True, "display_order": 3, "options": ["Monthly Subscription", "Yearly Subscription", "Lifetime License", "Freemium", "Open Source", "Enterprise Custom"]},
            {"name": "pricing_model", "label": "Pricing Tier Structure", "field_type": "SELECT", "filterable": True, "display_order": 4, "options": ["Per User / Month", "Flat Rate", "Usage-Based", "Tiered Storage"]},
            {"name": "cpu_requirement", "label": "Min CPU Cores", "field_type": "NUMBER", "unit": "Cores", "display_order": 5},
            {"name": "ram_requirement", "label": "Min RAM", "field_type": "NUMBER", "unit": "GB", "filterable": True, "display_order": 6},
            {"name": "storage_requirement", "label": "Storage Allocation", "field_type": "NUMBER", "unit": "GB", "display_order": 7},
            {"name": "programming_language", "label": "Primary Tech Stack", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 8, "options": ["Python", "JavaScript / Node.js", "TypeScript", "Java", "C# / .NET", "Go", "PHP", "Rust"]},
            {"name": "api_available", "label": "REST/GraphQL API Included", "field_type": "BOOLEAN", "filterable": True, "display_order": 9},
            {"name": "demo_url", "label": "Live Demo URL", "field_type": "URL", "display_order": 10},
            {"name": "documentation_url", "label": "API Docs URL", "field_type": "URL", "display_order": 11},
            {"name": "download_url", "label": "Download / Installer URL", "field_type": "URL", "display_order": 12}
        ]
    },

    # 3. SPORTS EQUIPMENT & APPAREL
    {
        "name": "Sports Equipment & Apparel",
        "code": "sports",
        "description": "Pre-configured template for sports gear, footwear, and athletic equipment",
        "icon": "Trophy",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Cricket", "children": ["English Willow Bats", "Leather Balls", "Protective Pads", "Helmets"]},
            {"name": "Football", "children": ["Match Footballs", "Team Jerseys", "Studs & Cleats", "Shin Guards"]},
            {"name": "Racquet Sports", "children": ["Tennis Racquets", "Badminton Racquets", "Shuttlecocks", "Grips & Strings"]},
            {"name": "Fitness & Gym", "children": ["Dumbbells & Weights", "Treadmills", "Resistance Bands", "Yoga Mats"]}
        ],
        "fields": [
            {"name": "sport_type", "label": "Sport Category", "field_type": "SELECT", "filterable": True, "display_order": 1, "options": ["Cricket", "Football", "Basketball", "Tennis", "Badminton", "Running", "Gym & Fitness", "Swimming", "Cycling"]},
            {"name": "brand", "label": "Brand", "field_type": "SELECT", "filterable": True, "searchable": True, "display_order": 2, "options": ["Nike", "Adidas", "Puma", "Wilson", "Yonex", "SG", "Cosco", "Under Armour", "Decathlon"]},
            {"name": "player_level", "label": "Player Expertise", "field_type": "SELECT", "filterable": True, "display_order": 3, "options": ["Beginner", "Intermediate", "Professional", "Tournament Grade"]},
            {"name": "material", "label": "Primary Material", "field_type": "SELECT", "filterable": True, "display_order": 4, "options": ["Carbon Fiber", "Aluminum", "English Willow Wood", "Kashmir Willow", "Natural Rubber", "Synthetic Leather", "Polyurethane"]},
            {"name": "weight", "label": "Item Weight", "field_type": "NUMBER", "unit": "grams", "display_order": 5},
            {"name": "shoe_size", "label": "Shoe Size Options", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 6, "options": ["UK 6 / US 7", "UK 7 / US 8", "UK 8 / US 9", "UK 9 / US 10", "UK 10 / US 11", "UK 11 / US 12"]},
            {"name": "sole_type", "label": "Sole & Cleat Type", "field_type": "SELECT", "filterable": True, "display_order": 7, "options": ["Rubber Studs", "Metal Spikes", "Carbon Plate", "EVA Foam Cushion", "Non-Marking Rubber"]},
            {"name": "gender", "label": "Target Gender", "field_type": "SELECT", "filterable": True, "display_order": 8, "options": ["Men", "Women", "Junior / Kids", "Unisex"]}
        ]
    },

    # 4. JEWELLERY & LUXURY
    {
        "name": "Jewellery & Luxury",
        "code": "jewellery",
        "description": "Pre-configured template for precious metals, diamonds, gemstones, and luxury ornaments",
        "icon": "Gem",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Rings", "children": ["Solitaire Engagement Rings", "Gold Bands", "Gemstone Rings"]},
            {"name": "Necklaces", "children": ["Pendant Sets", "Chokers", "Gold Chains", "Diamond Necklaces"]},
            {"name": "Earrings", "children": ["Diamond Studs", "Gold Jhumkas", "Hoop Earrings"]},
            {"name": "Coins & Bars", "children": ["24K Gold Coins", "999 Silver Bars"]}
        ],
        "fields": [
            {"name": "metal_type", "label": "Precious Metal", "field_type": "SELECT", "filterable": True, "display_order": 1, "options": ["Yellow Gold", "Rose Gold", "White Gold", "Platinum", "925 Sterling Silver"]},
            {"name": "purity", "label": "Metal Purity", "field_type": "SELECT", "filterable": True, "display_order": 2, "options": ["24K (99.9%)", "22K (91.6%)", "18K (75.0%)", "14K (58.5%)", "925 Sterling Silver"]},
            {"name": "gross_weight", "label": "Gross Weight", "field_type": "NUMBER", "unit": "grams", "display_order": 3},
            {"name": "net_gold_weight", "label": "Net Metal Weight", "field_type": "NUMBER", "unit": "grams", "display_order": 4},
            {"name": "gemstone", "label": "Primary Gemstone", "field_type": "SELECT", "filterable": True, "display_order": 5, "options": ["Natural Diamond", "Lab-Grown Diamond", "Ruby", "Emerald", "Blue Sapphire", "Pearl", "None"]},
            {"name": "diamond_carat", "label": "Diamond Total Carat", "field_type": "NUMBER", "unit": "carats", "display_order": 6},
            {"name": "diamond_clarity", "label": "Diamond Clarity", "field_type": "SELECT", "filterable": True, "display_order": 7, "options": ["FL (Flawless)", "IF (Internally Flawless)", "VVS1", "VVS2", "VS1", "VS2", "SI1"]},
            {"name": "diamond_cut", "label": "Diamond Cut", "field_type": "SELECT", "filterable": True, "display_order": 8, "options": ["Ideal Cut", "Excellent Cut", "Very Good Cut", "Good Cut"]},
            {"name": "certification", "label": "Hallmark & Cert", "field_type": "SELECT", "filterable": True, "display_order": 9, "options": ["BIS Hallmarked", "GIA Certified", "IGI Certified", "SGL Certified"]}
        ]
    },

    # 5. ELECTRONICS & HARDWARE
    {
        "name": "Electronics & Hardware",
        "code": "electronics",
        "description": "Pre-configured template for smartphones, computers, cameras, and consumer electronics",
        "icon": "Cpu",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Smartphones & Tablets", "children": ["iOS Devices", "Android Flagships", "Budget Smartphones", "Tablets"]},
            {"name": "Computers & Laptops", "children": ["Gaming Laptops", "Ultrabooks", "MacBooks", "Desktop PCs"]},
            {"name": "Audio & Headphones", "children": ["Wireless Earbuds", "Noise Cancelling Headphones", "Soundbars"]},
            {"name": "Cameras & Wearables", "children": ["DSLR & Mirrorless", "Smartwatches", "Fitness Bands"]}
        ],
        "fields": [
            {"name": "brand", "label": "Brand", "field_type": "SELECT", "filterable": True, "searchable": True, "display_order": 1, "options": ["Apple", "Samsung", "Sony", "Dell", "HP", "Lenovo", "Asus", "Xiaomi", "LG", "Bose"]},
            {"name": "model_number", "label": "Model Number / Code", "field_type": "TEXT", "searchable": True, "display_order": 2},
            {"name": "warranty_period", "label": "Manufacturer Warranty", "field_type": "SELECT", "filterable": True, "display_order": 3, "options": ["6 Months", "1 Year Limited", "2 Years Standard", "3 Years Extended"]},
            {"name": "screen_size", "label": "Display Screen Size", "field_type": "NUMBER", "unit": "inches", "display_order": 4},
            {"name": "processor", "label": "Processor / Chipset", "field_type": "TEXT", "searchable": True, "display_order": 5},
            {"name": "ram", "label": "System RAM Memory", "field_type": "SELECT", "filterable": True, "display_order": 6, "options": ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"]},
            {"name": "storage", "label": "Internal Storage Capacity", "field_type": "SELECT", "filterable": True, "display_order": 7, "options": ["128 GB", "256 GB", "512 GB", "1 TB SSD", "2 TB SSD"]},
            {"name": "battery_capacity", "label": "Battery Size", "field_type": "NUMBER", "unit": "mAh", "display_order": 8},
            {"name": "connectivity", "label": "Connectivity Features", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 9, "options": ["5G Cellular", "Wi-Fi 6E / 7", "Bluetooth 5.3", "USB-C Thunderbolt 4", "HDMI 2.1"]}
        ]
    },

    # 6. FURNITURE & HOME DECOR
    {
        "name": "Furniture & Home Decor",
        "code": "furniture",
        "description": "Pre-configured template for home & office furniture, living, bedroom, and outdoor decor",
        "icon": "Armchair",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Living Room", "children": ["Sofas & Couches", "Recliners", "Coffee Tables", "TV Units"]},
            {"name": "Bedroom", "children": ["King Size Beds", "Queen Size Beds", "Wardrobes", "Orthopedic Mattresses"]},
            {"name": "Office Furniture", "children": ["Ergonomic Chairs", "Standing Desks", "Bookcases & Filing Units"]}
        ],
        "fields": [
            {"name": "material", "label": "Primary Material", "field_type": "SELECT", "filterable": True, "display_order": 1, "options": ["Solid Teak Wood", "Sheesham Wood", "Engineered Wood", "Powder Coated Metal", "Genuine Leather", "Velvet Fabric", "Glass & Steel"]},
            {"name": "primary_color", "label": "Finish / Color", "field_type": "SELECT", "filterable": True, "display_order": 2, "options": ["Walnut Brown", "Honey Teak", "Charcoal Grey", "Beige", "Matte Black", "Off White", "Navy Blue"]},
            {"name": "dimensions", "label": "Dimensions (L x W x H)", "field_type": "TEXT", "display_order": 3},
            {"name": "seating_capacity", "label": "Seating Capacity", "field_type": "SELECT", "filterable": True, "display_order": 4, "options": ["1 Seater / Armchair", "2 Seater", "3 Seater", "L-Shape Sectional", "6 Seater Dining"]},
            {"name": "assembly_required", "label": "DIY Assembly Required", "field_type": "BOOLEAN", "filterable": True, "display_order": 5},
            {"name": "style", "label": "Design Style", "field_type": "SELECT", "filterable": True, "display_order": 6, "options": ["Modern Minimalist", "Contemporary", "Traditional Classic", "Industrial Rustic", "Scandinavian"]}
        ]
    },

    # 7. COSMETICS & BEAUTY
    {
        "name": "Cosmetics & Beauty",
        "code": "cosmetics",
        "description": "Pre-configured template for skincare, makeup, haircare, and personal grooming",
        "icon": "Sparkles",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Skincare", "children": ["Face Cleansers", "Vitamin C Serums", "Moisturizers", "Sunscreens (SPF)"]},
            {"name": "Makeup", "children": ["Matte Lipsticks", "Foundations", "Mascaras", "Eyeshadow Palettes"]},
            {"name": "Haircare", "children": ["Nourishing Shampoos", "Conditioners", "Hair Serums & Oils"]}
        ],
        "fields": [
            {"name": "skin_type", "label": "Target Skin Type", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 1, "options": ["All Skin Types", "Oily Skin", "Dry Skin", "Sensitive Skin", "Combination Skin", "Acne-Prone"]},
            {"name": "finish", "label": "Makeup Finish", "field_type": "SELECT", "filterable": True, "display_order": 2, "options": ["Matte", "Glossy", "Satin", "Dewy Glow", "Natural", "Shimmer"]},
            {"name": "volume_weight", "label": "Net Content Size", "field_type": "NUMBER", "unit": "ml/grams", "display_order": 3},
            {"name": "ingredients_type", "label": "Formulation Claims", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 4, "options": ["100% Vegan", "Cruelty-Free (PETA)", "Paraben-Free", "Certified Organic", "Dermatologist Tested", "Sulfate-Free"]},
            {"name": "spf", "label": "Sun Protection (SPF)", "field_type": "SELECT", "filterable": True, "display_order": 5, "options": ["None", "SPF 15", "SPF 30 PA+++", "SPF 50 PA++++", "SPF 50+ Broad Spectrum"]},
            {"name": "shade_color", "label": "Shade Name / Code", "field_type": "TEXT", "searchable": True, "display_order": 6}
        ]
    },

    # 8. FOOD & BEVERAGE
    {
        "name": "Food & Beverage",
        "code": "food",
        "description": "Pre-configured template for packaged foods, beverages, gourmet goods, and fresh produce",
        "icon": "Utensils",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Packaged Foods", "children": ["Snacks & Chips", "Breakfast Cereals", "Noodles & Pasta"]},
            {"name": "Beverages", "children": ["Cold-Pressed Juices", "Specialty Coffee", "Green Teas"]},
            {"name": "Organic & Health Foods", "children": ["Protein Powders", "Organic Honey", "Nuts & Seeds"]}
        ],
        "fields": [
            {"name": "dietary_type", "label": "Dietary Preference", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 1, "options": ["100% Vegetarian", "Non-Vegetarian", "Vegan", "Gluten-Free", "Sugar-Free", "Keto-Friendly", "Organic"]},
            {"name": "shelf_life", "label": "Shelf Life Duration", "field_type": "TEXT", "display_order": 2},
            {"name": "net_weight", "label": "Net Pack Weight", "field_type": "NUMBER", "unit": "grams", "display_order": 3},
            {"name": "packaging_type", "label": "Container Packaging", "field_type": "SELECT", "filterable": True, "display_order": 4, "options": ["Zip Pouch", "Tin Can", "Glass Jar", "Tetra Pack", "Cardboard Box"]},
            {"name": "storage_temperature", "label": "Storage Conditions", "field_type": "SELECT", "filterable": True, "display_order": 5, "options": ["Ambient Room Temp", "Refrigerated (2-8°C)", "Frozen (-18°C)"]},
            {"name": "fssai_certified", "label": "Food Safety Certified", "field_type": "BOOLEAN", "filterable": True, "display_order": 6}
        ]
    },

    # 9. MANUFACTURING & INDUSTRIAL
    {
        "name": "Manufacturing & Industrial",
        "code": "manufacturing",
        "description": "Pre-configured template for industrial machinery, hardware fasteners, raw materials, and spare parts",
        "icon": "Factory",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Industrial Machinery", "children": ["CNC Machines", "Lathe Machines", "Industrial Pumps"]},
            {"name": "Fasteners & Hardware", "children": ["High-Tensile Bolts", "Control Valves", "Flanges"]},
            {"name": "Electrical Components", "children": ["Electric Motors", "Transformers", "Circuit Breakers"]}
        ],
        "fields": [
            {"name": "part_number", "label": "Industrial Part Number", "field_type": "TEXT", "searchable": True, "display_order": 1},
            {"name": "grade_specification", "label": "Material Grade Spec", "field_type": "TEXT", "searchable": True, "display_order": 2},
            {"name": "operating_voltage", "label": "Operating Voltage", "field_type": "NUMBER", "unit": "Volts", "display_order": 3},
            {"name": "power_rating", "label": "Motor Power Rating", "field_type": "NUMBER", "unit": "kW", "display_order": 4},
            {"name": "moq", "label": "Minimum Order Qty (MOQ)", "field_type": "NUMBER", "unit": "units", "display_order": 5},
            {"name": "certifications", "label": "Quality Compliance", "field_type": "MULTI_SELECT", "filterable": True, "display_order": 6, "options": ["ISO 9001:2015", "CE Certified", "RoHS Compliant", "UL Listed", "ISI Marked"]}
        ]
    },

    # 10. REAL ESTATE & PROPERTY
    {
        "name": "Real Estate & Property",
        "code": "real_estate",
        "description": "Pre-configured template for residential apartments, commercial offices, villas, and land plots",
        "icon": "Building",
        "product_type_default": "SERVICE",
        "categories": [
            {"name": "Residential", "children": ["Luxury Apartments", "Independent Villas", "Penthouses", "Residential Plots"]},
            {"name": "Commercial", "children": ["IT Office Spaces", "Retail Shops & Showrooms", "Warehouses & Logistics"]}
        ],
        "fields": [
            {"name": "property_type", "label": "Property Classification", "field_type": "SELECT", "filterable": True, "display_order": 1, "options": ["Apartment / Flat", "Independent House", "Villa", "Commercial Office", "Retail Shop", "Plot / Land"]},
            {"name": "transaction_type", "label": "Listing Purpose", "field_type": "SELECT", "filterable": True, "display_order": 2, "options": ["For Sale", "For Rent / Lease", "PG / Co-Living"]},
            {"name": "bhk_type", "label": "BHK Configuration", "field_type": "SELECT", "filterable": True, "display_order": 3, "options": ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Studio Apartment"]},
            {"name": "carpet_area", "label": "Carpet Area Size", "field_type": "NUMBER", "unit": "sq ft", "filterable": True, "display_order": 4},
            {"name": "location_city", "label": "City / Location", "field_type": "SELECT", "filterable": True, "searchable": True, "display_order": 5, "options": ["Mumbai", "Delhi NCR", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata"]},
            {"name": "furnishing", "label": "Furnishing Status", "field_type": "SELECT", "filterable": True, "display_order": 6, "options": ["Fully Furnished", "Semi-Furnished", "Unfurnished"]},
            {"name": "possession_status", "label": "Possession Timeline", "field_type": "SELECT", "filterable": True, "display_order": 7, "options": ["Ready to Move", "Under Construction", "New Launch"]}
        ]
    },

    # 11. AUTOMOBILE & SPARE PARTS
    {
        "name": "Automobile & Spare Parts",
        "code": "automobile",
        "description": "Pre-configured template for vehicles, auto parts, OEM spares, tires, and accessories",
        "icon": "Car",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "Vehicles", "children": ["Electric Cars", "SUVs & Sedans", "Motorcycles & Scooters"]},
            {"name": "Engine Parts", "children": ["Pistons & Cylinders", "Air & Oil Filters", "Spark Plugs"]},
            {"name": "Brakes & Tires", "children": ["Brake Pads & Discs", "Alloy Wheels", "Tubeless Tires"]}
        ],
        "fields": [
            {"name": "compatible_make", "label": "Vehicle Brand Make", "field_type": "MULTI_SELECT", "filterable": True, "searchable": True, "display_order": 1, "options": ["Toyota", "Honda", "Hyundai", "Maruti Suzuki", "BMW", "Mercedes-Benz", "Ford", "Tata Motors", "Mahindra"]},
            {"name": "compatible_model", "label": "Compatible Car Model", "field_type": "TEXT", "searchable": True, "display_order": 2},
            {"name": "model_year_range", "label": "Model Year Range", "field_type": "TEXT", "display_order": 3},
            {"name": "part_position", "label": "Installation Position", "field_type": "SELECT", "filterable": True, "display_order": 4, "options": ["Front Assembly", "Rear Assembly", "Left Side", "Right Side", "Engine Bay", "Universal Fit"]},
            {"name": "fuel_type", "label": "Engine Fuel Type", "field_type": "SELECT", "filterable": True, "display_order": 5, "options": ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG"]}
        ]
    },

    # 12. GENERAL / MULTI-PURPOSE
    {
        "name": "General / Multi-Purpose",
        "code": "general",
        "description": "Flexible multi-purpose product template suitable for general retail and services",
        "icon": "Box",
        "product_type_default": "PHYSICAL",
        "categories": [
            {"name": "General Products", "children": ["Standard Items", "Bundles"]},
            {"name": "Services", "children": ["Consulting", "Support & Maintenance"]}
        ],
        "fields": [
            {"name": "brand", "label": "Brand Name", "field_type": "TEXT", "filterable": True, "searchable": True, "display_order": 1},
            {"name": "color", "label": "Color", "field_type": "TEXT", "filterable": True, "display_order": 2},
            {"name": "size", "label": "Size / Dimension", "field_type": "TEXT", "filterable": True, "display_order": 3},
            {"name": "unit", "label": "Unit of Measurement", "field_type": "SELECT", "display_order": 4, "options": ["Pieces (Pcs)", "Kilograms (Kg)", "Liters (L)", "Box / Pack", "Hours / Service"]}
        ]
    }
]

def seed_templates():
    print("--- Executing Module 2 Seed Script: Predefined Industry Templates ---")
    db = SessionLocal()

    for tmpl_data in TEMPLATES_DATA:
        # Check if template code exists
        existing_tmpl = db.query(IndustryTemplate).filter(IndustryTemplate.code == tmpl_data["code"]).first()
        if existing_tmpl:
            print(f"  [UPDATE] Template '{tmpl_data['name']}' ({tmpl_data['code']}) already exists. Re-seeding fields...")
            db.delete(existing_tmpl)
            db.commit()

        # Create IndustryTemplate
        tmpl = IndustryTemplate(
            name=tmpl_data["name"],
            code=tmpl_data["code"],
            description=tmpl_data["description"],
            icon=tmpl_data["icon"],
            product_type_default=tmpl_data["product_type_default"],
            is_system=True,
            is_active=True
        )
        db.add(tmpl)
        db.commit()
        db.refresh(tmpl)

        # Seed Categories & Subcategories
        for c_idx, cat_info in enumerate(tmpl_data.get("categories", [])):
            parent_cat = TemplateCategory(
                template_id=tmpl.id,
                name=cat_info["name"],
                display_order=c_idx + 1
            )
            db.add(parent_cat)
            db.commit()
            db.refresh(parent_cat)

            for sub_idx, sub_name in enumerate(cat_info.get("children", [])):
                sub_cat = TemplateCategory(
                    template_id=tmpl.id,
                    parent_id=parent_cat.id,
                    name=sub_name,
                    display_order=sub_idx + 1
                )
                db.add(sub_cat)

        # Seed Fields
        for f_info in tmpl_data.get("fields", []):
            field = TemplateField(
                template_id=tmpl.id,
                name=f_info["name"],
                label=f_info["label"],
                field_type=f_info["field_type"],
                unit=f_info.get("unit"),
                required=f_info.get("required", False),
                filterable=f_info.get("filterable", False),
                searchable=f_info.get("searchable", False),
                sortable=f_info.get("sortable", False),
                display_order=f_info.get("display_order", 0),
                options_json=json.dumps(f_info["options"]) if "options" in f_info else None
            )
            db.add(field)

        db.commit()
        print(f"  [OK] Seeded Industry Template '{tmpl_data['name']}' with {len(tmpl_data['fields'])} fields & {len(tmpl_data['categories'])} categories.")

    db.close()
    print("\n=======================================================")
    print("ALL 12 INDUSTRY TEMPLATES SEEDED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    seed_templates()
