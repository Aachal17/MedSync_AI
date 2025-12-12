import React, { useState, useRef } from 'react';
import { Product, CartItem } from '../types';
import { MOCK_PRODUCTS } from '../services/mockData';
import { ShoppingCart, Search, Filter, Plus, Minus, X, Check, Loader2, Sparkles, DollarSign, Camera, ScanLine, ArrowRight } from 'lucide-react';
import { smartProductSearch, analyzePrescriptionAndMatch } from '../services/geminiService';

export const MarketplaceView: React.FC = () => {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Scan State
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultImage, setScanResultImage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<{ product: Product, quantity: number }[]>([]);
  const [showScanResult, setShowScanResult] = useState(false);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // --- Cart Logic ---
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // --- Search Logic ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query) {
      setFilteredProducts(selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory));
    } else {
      const lower = query.toLowerCase();
      const textMatched = products.filter(p => 
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower))
      );
      setFilteredProducts(textMatched);
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSmartSearching(true);
    const ids = await smartProductSearch(searchQuery, products);
    const matched = products.filter(p => ids.includes(p.id));
    setFilteredProducts(matched);
    setIsSmartSearching(false);
    setSelectedCategory('All');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
    if (category === 'All') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === category));
    }
  };

  // --- Scan Logic ---
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScanResultImage(base64);
      setIsScanning(true);
      
      const base64Data = base64.split(',')[1];
      const matches = await analyzePrescriptionAndMatch(base64Data, products);
      
      const foundItems: { product: Product, quantity: number }[] = [];
      matches.forEach(match => {
        const p = products.find(prod => prod.id === match.productId);
        if (p) {
          foundItems.push({ product: p, quantity: match.quantity || 1 });
        }
      });

      setScannedItems(foundItems);
      setIsScanning(false);
      setShowScanModal(false);
      setShowScanResult(true);
    };
    reader.readAsDataURL(file);
  };

  const updateScannedQuantity = (idx: number, delta: number) => {
    setScannedItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const addScannedItemsToCart = () => {
    scannedItems.forEach(item => {
      handleAddToCart(item.product, item.quantity);
    });
    setShowScanResult(false);
    setShowCart(true);
  };

  const confirmOrder = () => {
    setOrderSuccess(true);
    setCart([]);
    setTimeout(() => {
      setOrderSuccess(false);
      setShowCheckout(false);
    }, 3000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm z-10 sticky top-0">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pharmacy Store</h2>
            <p className="text-xs text-slate-500 hidden md:block">Find medications, upload prescriptions, and order instantly.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
               onClick={() => setShowScanModal(true)}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
             >
               <Camera size={18} />
               <span>Scan Rx</span>
             </button>

             <button 
               onClick={() => setShowCart(true)} 
               className="relative p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition shadow-sm"
             >
               <ShoppingCart size={20} />
               {cartCount > 0 && (
                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in">
                   {cartCount}
                 </span>
               )}
             </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-medical-600 transition-colors" size={18} />
              <input 
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                placeholder="Search medicines, symptoms..." 
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none transition-all shadow-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <button 
              onClick={handleSmartSearch}
              disabled={isSmartSearching}
              className="px-4 py-2 bg-medical-50 text-medical-700 border border-medical-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-medical-100 transition disabled:opacity-70 whitespace-nowrap"
            >
              {isSmartSearching ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              <span className="hidden sm:inline">AI Search</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
             <Filter size={16} className="text-slate-400 shrink-0" />
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => handleCategoryChange(cat)}
                 className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                   selectedCategory === cat 
                     ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                     : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                 }`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
         {filteredProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <div className="bg-white p-6 rounded-full shadow-sm mb-4">
               <Search size={32} className="text-slate-300" />
             </div>
             <p className="font-medium">No products found matching your criteria.</p>
             <button onClick={() => {setSearchQuery(''); setSelectedCategory('All'); setFilteredProducts(products);}} className="mt-2 text-medical-600 text-sm hover:underline">Clear Filters</button>
           </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {filteredProducts.map(product => (
               <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                 <div className="h-48 overflow-hidden relative bg-slate-100">
                   <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                   <div className="absolute top-3 left-3">
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-slate-700 shadow-sm border border-white/50">
                        {product.category}
                     </span>
                   </div>
                 </div>
                 <div className="p-5 flex-1 flex flex-col">
                   <div className="flex-1 mb-4">
                     <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{product.name}</h3>
                        <span className="font-bold text-medical-700 bg-medical-50 px-2 py-1 rounded-lg text-sm">
                           ${product.price.toFixed(2)}
                        </span>
                     </div>
                     <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>
                   </div>
                   <button 
                     onClick={() => handleAddToCart(product)}
                     className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-slate-200"
                   >
                     <Plus size={16} /> Add to Cart
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* Scan Modal (Upload) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
              <button onClick={() => setShowScanModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                <X size={16} />
              </button>
              
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ScanLine size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Scan Prescription</h3>
                 <p className="text-sm text-slate-500 mt-2">Take a photo of your medicine bottle or prescription paper to instantly find products.</p>
              </div>

              {isScanning ? (
                <div className="py-8 flex flex-col items-center">
                   <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                   <p className="text-blue-800 font-medium">Analyzing Image...</p>
                </div>
              ) : (
                <div className="space-y-3">
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors group">
                      <Camera size={32} className="text-blue-400 group-hover:text-blue-600 mb-2 transition-colors" />
                      <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Tap to Capture</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanUpload} />
                   </label>
                   <p className="text-xs text-center text-slate-400">Supported formats: JPG, PNG</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Scan Result Modal */}
      {showScanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <Sparkles size={18} className="text-purple-600" /> Detected Items
                 </h3>
                 <button onClick={() => setShowScanResult(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                 {scannedItems.length === 0 ? (
                   <div className="text-center py-8">
                     <p className="text-slate-500 mb-4">No matching products found in our catalog.</p>
                     <button onClick={() => setShowScanResult(false)} className="text-blue-600 font-semibold text-sm">Try manual search</button>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {scannedItems.map((item, idx) => (
                       <div key={item.product.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                          <img src={item.product.image} className="w-16 h-16 rounded-xl object-cover bg-slate-100" />
                          <div className="flex-1">
                             <h4 className="font-bold text-slate-800 text-sm mb-1">{item.product.name}</h4>
                             <p className="text-xs text-slate-500 mb-3 line-clamp-1">{item.product.description}</p>
                             <div className="flex justify-between items-center">
                                <span className="font-bold text-blue-600 text-sm">${item.product.price}</span>
                                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                   <button onClick={() => updateScannedQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600"><Minus size={12} /></button>
                                   <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                   <button onClick={() => updateScannedQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600"><Plus size={12} /></button>
                                </div>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
              
              {scannedItems.length > 0 && (
                <div className="p-5 border-t border-slate-100 bg-slate-50">
                   <button 
                     onClick={addScannedItemsToCart}
                     className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                   >
                     Add {scannedItems.reduce((acc, i) => acc + i.quantity, 0)} Items to Cart <ArrowRight size={18} />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="absolute inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity" onClick={() => setShowCart(false)}></div>
           <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart size={20} /> Your Cart</h3>
                 <button onClick={() => setShowCart(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                 {cart.length === 0 ? (
                   <div className="text-center py-20 text-slate-400">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart size={32} className="opacity-30" />
                      </div>
                      <p className="font-medium">Your cart is empty.</p>
                      <button onClick={() => setShowCart(false)} className="mt-4 text-medical-600 font-bold text-sm">Start Shopping</button>
                   </div>
                 ) : (
                   cart.map(item => (
                     <div key={item.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                       <img src={item.image} className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                       <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between items-start">
                             <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</h4>
                             <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                             <span className="text-sm font-bold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                             <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-red-500"><Minus size={12} /></button>
                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-green-600"><Plus size={12} /></button>
                             </div>
                          </div>
                       </div>
                     </div>
                   ))
                 )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800">${cartTotal.toFixed(2)}</span>
                 </div>
                 <button 
                   onClick={() => { setShowCart(false); setShowCheckout(true); }}
                   disabled={cart.length === 0}
                   className="w-full py-4 bg-medical-600 hover:bg-medical-700 text-white rounded-xl font-bold shadow-xl shadow-medical-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                   Proceed to Checkout <ArrowRight size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              {orderSuccess ? (
                <div className="text-center py-10">
                   <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                     <Check size={40} />
                   </div>
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">Order Confirmed!</h3>
                   <p className="text-slate-500">Your medicines will be delivered shortly.</p>
                   <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100 inline-block w-full">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Delivery</p>
                      <p className="font-bold text-slate-800">Today, by 6:00 PM</p>
                   </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Checkout</h3>
                    <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
                  </div>
                  
                  <div className="space-y-5 mb-8">
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                       <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Total</p>
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{cartCount} items</span>
                       </div>
                       <p className="text-3xl font-bold text-medical-600">${cartTotal.toFixed(2)}</p>
                     </div>

                     <div className="border-2 border-green-100 bg-green-50/50 p-4 rounded-2xl flex items-start gap-4">
                        <div className="bg-green-100 p-2.5 rounded-xl text-green-600 shrink-0">
                           <DollarSign size={24} />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-center">
                              <h4 className="font-bold text-green-900 text-sm">Cash on Delivery</h4>
                              <Check size={16} className="text-green-600" />
                           </div>
                           <p className="text-xs text-green-700 mt-1 leading-relaxed">Pay with cash or card upon delivery to the agent.</p>
                        </div>
                     </div>
                     
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2 uppercase ml-1">Delivery Address</label>
                       <textarea 
                         className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-medical-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                         rows={2}
                         defaultValue="123 Wellness Ave, Healthy City, HC 90210"
                       />
                     </div>
                  </div>

                  <button 
                    onClick={confirmOrder}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Confirm Order <span className="opacity-70 font-normal">|</span> ${cartTotal.toFixed(2)}
                  </button>
                </>
              )}
           </div>
        </div>
      )}
    </div>
  );
};