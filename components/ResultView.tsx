import React, { useMemo, useState } from 'react';
import { ProjectEstimate, EstimateResult, MaterialItem, CategoryTrend } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, Share2, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Minus, ArrowLeftRight, Filter, ChevronDown, Check, Plus, X } from 'lucide-react';
import { Button } from './Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ResultViewProps {
  projectData: ProjectEstimate;
  onReset: () => void;
  onAddItem: (fileId: string, item: MaterialItem) => void;
}

const COLORS = [
  '#f59e0b', // Amber 500
  '#d97706', // Amber 600
  '#b45309', // Amber 700
  '#78350f', // Amber 900
  '#525252', // Neutral 600
  '#404040', // Neutral 700
  '#262626', // Neutral 800
];

export const ResultView: React.FC<ResultViewProps> = ({ projectData, onReset, onAddItem }) => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  
  // -- NEW STATE FOR FILTERS AND TOGGLES --
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [unitToggleState, setUnitToggleState] = useState<Record<string, boolean>>({});

  // -- MODAL STATE --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MaterialItem> & { fileId: string }>({
      category: 'General',
      material: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      fileId: ''
  });

  // -- EXPORT FUNCTIONS --
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(218, 165, 32); // Gold color
    doc.text("DziVan Smart Estimation Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Market Region: Ghana`, 14, 31);
    
    let yPos = 40;

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Grand Total Summary", 14, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text(`Total Budget: ${formatCurrency(projectData.grandTotal)}`, 14, yPos);
    yPos += 15;

    // Iterate through estimates
    projectData.estimates.forEach((est) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`File: ${est.fileName} - ${est.projectName}`, 14, yPos);
        yPos += 10;

        // @ts-ignore
        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Material', 'Qty', 'Unit', 'Unit Price', 'Total']],
            body: est.breakdown.map((item, idx) => {
                // Check if this specific item was toggled in the UI
                const key = `${est.fileId}-${idx}`;
                const isToggled = unitToggleState[key];
                
                const qty = isToggled && item.secondaryQuantity ? item.secondaryQuantity : item.quantity;
                const unit = isToggled && item.secondaryUnit ? item.secondaryUnit : item.unit;
                const price = isToggled && item.secondaryQuantity 
                   ? (item.totalPrice / item.secondaryQuantity) 
                   : item.unitPrice;

                return [
                  item.category,
                  item.material,
                  qty.toFixed(2),
                  unit,
                  formatCurrency(price),
                  formatCurrency(item.totalPrice)
                ];
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [218, 165, 32] }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save("DziVan_Smart_Report.pdf");
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
        ["DziVan Smart Project Estimate"],
        ["Date", new Date().toLocaleDateString()],
        ["Grand Total", projectData.grandTotal],
        [],
        ["File Estimates"]
    ];
    
    projectData.estimates.forEach(est => {
        summaryData.push([est.fileName, est.totalBudget]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Detail Sheets
    projectData.estimates.forEach((est, idx) => {
        const rows = est.breakdown.map((item, itemIdx) => {
            const key = `${est.fileId}-${itemIdx}`;
            const isToggled = unitToggleState[key];
            const qty = isToggled && item.secondaryQuantity ? item.secondaryQuantity : item.quantity;
            const unit = isToggled && item.secondaryUnit ? item.secondaryUnit : item.unit;
            const price = isToggled && item.secondaryQuantity 
                   ? (item.totalPrice / item.secondaryQuantity) 
                   : item.unitPrice;

            return {
              Category: item.category,
              Material: item.material,
              Quantity: qty,
              Unit: unit,
              UnitPrice: price,
              TotalPrice: item.totalPrice,
              Notes: item.notes
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, `Sheet_${idx + 1}`);
    });

    XLSX.writeFile(wb, "DziVan_Smart_Estimate.xlsx");
  };

  const currentEstimate = activeTab === 'summary' ? null : projectData.estimates.find(e => e.fileId === activeTab);

  // -- CHART DATA --
  const summaryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    projectData.estimates.forEach(est => {
      est.breakdown.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + item.totalPrice;
      });
    });
    return Object.keys(categories).map(key => ({
      name: key,
      value: categories[key]
    }));
  }, [projectData]);

  // Derived chart data based on active view
  const activeChartData = useMemo(() => {
    if (activeTab === 'summary') {
      return summaryChartData;
    } else if (currentEstimate) {
      const categories: Record<string, number> = {};
      currentEstimate.breakdown.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + item.totalPrice;
      });
      return Object.keys(categories).map(key => ({
        name: key,
        value: categories[key]
      }));
    }
    return [];
  }, [activeTab, summaryChartData, currentEstimate]);

  const formatCurrency = (amount: number) => {
    try {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: projectData.currency || 'GHS',
        }).format(amount);
    } catch(e) {
        return `${projectData.currency} ${amount.toLocaleString()}`;
    }
  };

  const formatShortCurrency = (amount: number) => {
     if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
     if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
     return amount.toString();
  };

  // Helper for sparklines
  const getSparklineData = (trend: CategoryTrend) => {
    if (trend.priceHistory && trend.priceHistory.length > 0) {
        return trend.priceHistory.map((val, i) => ({ i, val }));
    }
    // Fallback if AI didn't return history
    const base = 100;
    const data = [];
    for(let i=0; i<6; i++) {
        let val = base;
        if (trend.trend === 'UP') val = base + (i * 2) + (Math.random() * 2);
        if (trend.trend === 'DOWN') val = base - (i * 2) + (Math.random() * 2);
        if (trend.trend === 'STABLE') val = base + (Math.random() * 4 - 2);
        data.push({ i, val });
    }
    return data;
  };

  const getTrendColor = (trend: string) => {
      if (trend === 'UP') return '#ef4444'; // Red for Price Increase (Bad for buyer)
      if (trend === 'DOWN') return '#22c55e'; // Green for Price Drop (Good for buyer)
      return '#a3a3a3'; // Grey for Stable
  };

  // -- PREPARE TABLE DATA --
  
  // Flatten items with identifiers for Summary view, or just use single estimate items
  const displayItems = useMemo(() => {
      if (activeTab === 'summary') {
          return projectData.estimates.flatMap(est => 
              est.breakdown.map((item, idx) => ({
                  ...item,
                  _key: `${est.fileId}-${idx}`,
                  _file: est.fileName
              }))
          );
      } else if (currentEstimate) {
          return currentEstimate.breakdown.map((item, idx) => ({
              ...item,
              _key: `${currentEstimate.fileId}-${idx}`,
              _file: currentEstimate.fileName
          }));
      }
      return [];
  }, [activeTab, projectData, currentEstimate]);

  // Unique Categories for Filter
  const categories = useMemo(() => {
      const cats = new Set(displayItems.map(i => i.category));
      return ['All', ...Array.from(cats)];
  }, [displayItems]);

  // Filter Logic
  const filteredItems = useMemo(() => {
      if (selectedCategory === 'All') return displayItems;
      return displayItems.filter(i => i.category === selectedCategory);
  }, [selectedCategory, displayItems]);

  // Calculate the total of the currently visible items (ensures footer matches table content)
  const currentViewTotal = useMemo(() => {
      return filteredItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }, [filteredItems]);

  // Toggle Handler
  const toggleItemUnit = (key: string) => {
      setUnitToggleState(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  // -- MODAL HANDLERS --
  const openModal = () => {
      setNewItem({
          category: 'General',
          material: '',
          quantity: 1,
          unit: 'pcs',
          unitPrice: 0,
          notes: '',
          fileId: activeTab === 'summary' ? projectData.estimates[0]?.fileId : activeTab
      });
      setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItem.fileId || !newItem.material || !newItem.quantity || !newItem.unitPrice) return;
      
      onAddItem(newItem.fileId, {
          category: newItem.category || 'General',
          material: newItem.material,
          quantity: Number(newItem.quantity),
          unit: newItem.unit || 'pcs',
          unitPrice: Number(newItem.unitPrice),
          totalPrice: Number(newItem.quantity) * Number(newItem.unitPrice),
          notes: newItem.notes
      });
      setIsModalOpen(false);
  };

  return (
    <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Dashboard */}
      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl shadow-black/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 w-full md:w-auto mb-6 md:mb-0">
          <h2 className="text-3xl font-bold text-white mb-1">Project Dashboard</h2>
          <p className="text-neutral-400 text-sm">
            {projectData.estimates.length} Files Analyzed • Ghana Market Rates
          </p>
          <div className="flex gap-2 mt-4">
             <Button variant="outline" onClick={handleExportPDF} className="text-xs py-1.5 h-8 border-neutral-600 hover:bg-neutral-800 text-neutral-300">
                <FileText className="w-3 h-3 mr-2 text-amber-500" /> Export PDF
             </Button>
             <Button variant="outline" onClick={handleExportExcel} className="text-xs py-1.5 h-8 border-neutral-600 hover:bg-neutral-800 text-neutral-300">
                <FileSpreadsheet className="w-3 h-3 mr-2 text-green-500" /> Export Excel
             </Button>
          </div>
        </div>

        <div className="text-right relative z-10 bg-neutral-950/80 p-6 rounded-2xl border border-neutral-800 shadow-inner min-w-[250px]">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">Grand Total Estimate</p>
          <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
            {formatCurrency(projectData.grandTotal)}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <button
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'summary' 
                ? 'bg-amber-400 text-neutral-900 shadow-lg shadow-amber-400/20' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
        >
            Project Summary
        </button>
        {projectData.estimates.map((est) => (
            <button
                key={est.fileId}
                onClick={() => setActiveTab(est.fileId)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === est.fileId 
                    ? 'bg-amber-400 text-neutral-900 shadow-lg shadow-amber-400/20' 
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
            >
                {est.fileName}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Chart & Trends */}
        <div className="space-y-6">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                Cost Distribution
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {activeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #404040', backgroundColor: '#171717', color: '#fff' }}
                    itemStyle={{ color: '#fbbf24' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                Category Breakdown
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" horizontal={false} />
                  <XAxis type="number" stroke="#a3a3a3" tickFormatter={formatShortCurrency} />
                  <YAxis type="category" dataKey="name" stroke="#a3a3a3" width={80} tick={{fontSize: 10}} />
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    cursor={{fill: '#262626'}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #404040', backgroundColor: '#171717', color: '#fff' }}
                    itemStyle={{ color: '#fbbf24' }}
                  />
                  <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Trends */}
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                Market Trends (Ghana)
            </h3>
            <div className="space-y-3">
                {/* Use the first estimate's trends or summary trends */}
                {(projectData.estimates[0]?.marketTrends || [
                    { category: 'Cement', trend: 'UP', percentageChange: 5 },
                    { category: 'Steel', trend: 'STABLE', percentageChange: 0 },
                    { category: 'Lumber', trend: 'DOWN', percentageChange: 2 },
                ]).map((trend, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-950/50 p-3 rounded-lg border border-neutral-800 overflow-hidden">
                        <div className="flex flex-col w-20 sm:w-24 shrink-0">
                            <span className="text-neutral-300 font-medium truncate text-sm">{trend.category}</span>
                            <span className="text-[10px] text-neutral-500">Last 6 mo</span>
                        </div>

                        {/* Sparkline Chart */}
                        <div className="flex-grow h-8 mx-2 sm:mx-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getSparklineData(trend)}>
                                    <Line 
                                        type="monotone" 
                                        dataKey="val" 
                                        stroke={getTrendColor(trend.trend)} 
                                        strokeWidth={2} 
                                        dot={false}
                                        isAnimationActive={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border shrink-0 ${
                            trend.trend === 'UP' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            trend.trend === 'DOWN' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            'bg-neutral-700/30 text-neutral-400 border-neutral-700'
                        }`}>
                            {trend.trend === 'UP' && <TrendingUp className="w-3 h-3" />}
                            {trend.trend === 'DOWN' && <TrendingDown className="w-3 h-3" />}
                            {trend.trend === 'STABLE' && <Minus className="w-3 h-3" />}
                            {trend.trend}
                        </div>
                    </div>
                ))}
            </div>
          </div>
          
           <div className="pt-4">
              <Button variant="outline" onClick={onReset} className="w-full justify-center bg-transparent text-neutral-400 border-neutral-700 hover:bg-neutral-800 hover:text-white hover:border-amber-500/50 transition-colors">
                Start New Project Analysis
              </Button>
           </div>
        </div>

        {/* Right Col: Detailed Table */}
        <div className="lg:col-span-2 bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl flex flex-col relative">
            <div className="p-6 border-b border-neutral-800 bg-neutral-950/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white">Bill of Quantities</h3>
                    <p className="text-neutral-500 text-xs mt-1">
                        {activeTab === 'summary' ? 'Consolidated list of all materials' : `Materials for ${currentEstimate?.fileName}`}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Add Material Button */}
                    <Button variant="gold" onClick={openModal} className="h-9 px-3 text-xs flex items-center">
                        <Plus className="w-4 h-4 mr-1.5" /> Add Material
                    </Button>

                    {/* Category Filter Dropdown */}
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-amber-500" />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 pr-10 py-2 appearance-none cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat} {cat === 'All' ? 'Items' : ''}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-neutral-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-950 text-neutral-500 font-semibold border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4 uppercase text-xs tracking-wider">Item Details</th>
                            <th className="px-6 py-4 text-center uppercase text-xs tracking-wider">Qty</th>
                            <th className="px-6 py-4 text-right uppercase text-xs tracking-wider">Rate</th>
                            <th className="px-6 py-4 text-right uppercase text-xs tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                                    No items found in this category.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, idx) => {
                                const isToggled = unitToggleState[item._key] || false;
                                const hasSecondary = !!(item.secondaryQuantity && item.secondaryUnit);
                                
                                // Calculate values based on toggle state
                                const displayQty = isToggled && item.secondaryQuantity ? item.secondaryQuantity : item.quantity;
                                const displayUnit = isToggled && item.secondaryUnit ? item.secondaryUnit : item.unit;
                                
                                // Unit Price derived from Total / Qty
                                const displayRate = isToggled && item.secondaryQuantity 
                                    ? (item.totalPrice / item.secondaryQuantity) 
                                    : item.unitPrice;

                                return (
                                <tr key={item._key} className="hover:bg-neutral-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-neutral-200">{item.material}</div>
                                        <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            {item.category}
                                            {activeTab === 'summary' && <span className="ml-2 text-neutral-600 border-l border-neutral-700 pl-2">{item._file}</span>}
                                        </div>
                                        {item.notes && <div className="text-xs text-amber-500/70 italic mt-1">{item.notes}</div>}
                                    </td>
                                    
                                    {/* QTY COLUMN WITH TOGGLE */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="font-mono text-neutral-300 font-bold bg-neutral-800 inline-block px-2 py-1 rounded border border-neutral-700 text-xs">
                                                {displayQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayUnit}
                                            </div>
                                            
                                            {hasSecondary && (
                                                <button 
                                                    onClick={() => toggleItemUnit(item._key)}
                                                    className={`p-1 rounded-full transition-colors ${isToggled ? 'bg-amber-500/20 text-amber-500' : 'bg-neutral-800 text-neutral-500 hover:text-amber-400 hover:bg-neutral-700'}`}
                                                    title={`Switch to ${isToggled ? item.unit : item.secondaryUnit}`}
                                                >
                                                    <ArrowLeftRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-right font-mono text-neutral-400 text-xs">
                                        {formatCurrency(displayRate)}
                                        <span className="text-[10px] text-neutral-600 block">/{displayUnit}</span>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-right font-bold text-neutral-200 font-mono">
                                        {formatCurrency(item.totalPrice)}
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Table Footer */}
            <div className="bg-neutral-950 p-6 border-t border-neutral-800 mt-auto">
                <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">
                        {selectedCategory === 'All' ? 'Total Cost' : `Total (${selectedCategory})`}
                    </span>
                    <span className="text-2xl font-bold text-amber-500">
                        {formatCurrency(currentViewTotal)}
                    </span>
                </div>
            </div>
        </div>

      </div>

      {/* Add Custom Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-neutral-900 rounded-2xl border border-amber-500/20 shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Add Custom Material</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleModalSubmit} className="space-y-4">
                    {/* File Selection */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Add to Estimate</label>
                        <select 
                            required
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                            value={newItem.fileId}
                            onChange={(e) => setNewItem({...newItem, fileId: e.target.value})}
                        >
                            {projectData.estimates.map(est => (
                                <option key={est.fileId} value={est.fileId}>{est.fileName} - {est.projectName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
                            <input 
                                list="categories"
                                required
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                placeholder="e.g. Masonry"
                                value={newItem.category}
                                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                            />
                            <datalist id="categories">
                                {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                            </datalist>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Material Name</label>
                            <input 
                                required
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                placeholder="e.g. Nails"
                                value={newItem.material}
                                onChange={(e) => setNewItem({...newItem, material: e.target.value})}
                            />
                         </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                         <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Quantity</label>
                            <input 
                                type="number"
                                required
                                min="0.01"
                                step="any"
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Unit</label>
                            <input 
                                required
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                placeholder="pcs"
                                value={newItem.unit}
                                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Unit Price</label>
                            <input 
                                type="number"
                                required
                                min="0"
                                step="any"
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                value={newItem.unitPrice}
                                onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})}
                            />
                         </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Notes (Optional)</label>
                        <textarea 
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm h-20 resize-none"
                            value={newItem.notes || ''}
                            onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <div className="text-sm">
                            <span className="text-neutral-500">Total: </span>
                            <span className="font-bold text-amber-500">
                                {formatCurrency((newItem.quantity || 0) * (newItem.unitPrice || 0))}
                            </span>
                        </div>
                        <div className="flex gap-2">
                             <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs h-9">
                                Cancel
                             </Button>
                             <Button type="submit" variant="gold" className="text-xs h-9">
                                Add Item
                             </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};