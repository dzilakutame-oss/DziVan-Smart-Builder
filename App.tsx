import React, { useState, useRef, useEffect } from 'react';
import { AppState, ProjectEstimate, UploadedFile, EstimateResult, MaterialItem } from './types';
import { analyzeDrawing } from './services/geminiService';
import { AnalysisView } from './components/AnalysisView';
import { ResultView } from './components/ResultView';
import { Button } from './components/Button';
import { UploadCloud, FileText, X, HardHat, Sun, Moon, Plus, File as FileIcon, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [projectEstimate, setProjectEstimate] = useState<ProjectEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Drag & Drop and Progress State
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Processing file upload

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Theme (Always "Dark" Gold basically, but keeping structure if needed)
  useEffect(() => {
    // Force dark mode for the Gold/Black theme by default
    document.documentElement.classList.add('dark');
  }, []);

  const processFiles = (selectedFiles: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);

    const newUploadedFiles: UploadedFile[] = [];
    const fileArray = Array.from(selectedFiles);
    
    let processedCount = 0;

    fileArray.forEach(file => {
        // Accept Image and PDF
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
             // Skip invalid
             processedCount++;
             if(processedCount === fileArray.length) setIsProcessing(false);
             return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            
            // For PDF we might show a generic icon, for image the actual image
            const previewUrl = file.type.startsWith('image/') 
                ? URL.createObjectURL(file) 
                : ''; 

            newUploadedFiles.push({
                id: Math.random().toString(36).substring(7),
                file: file,
                base64: base64,
                mimeType: file.type,
                previewUrl: previewUrl,
                name: file.name
            });

            processedCount++;
            if (processedCount === fileArray.length) {
                setFiles(prev => [...prev, ...newUploadedFiles]);
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!fileInputRef.current) return;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setAppState(AppState.ANALYZING);
    try {
      const estimates: EstimateResult[] = [];
      
      // Analyze files sequentially to avoid hitting rate limits too hard if any
      for (const file of files) {
          const result = await analyzeDrawing(file.base64, file.mimeType, file.name, file.id);
          
          // SAFETY: Recalculate totals to fix potential AI math errors or missing totalBudget
          // Ensure each item has a totalPrice
          if (result.breakdown) {
              result.breakdown = result.breakdown.map(item => ({
                  ...item,
                  // If totalPrice is missing or 0, calculate it from quantity * unitPrice
                  totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
              }));
          } else {
              result.breakdown = [];
          }

          // Force recalculation of the total budget from the items
          const computedTotal = result.breakdown.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
          
          const correctedResult = {
              ...result,
              totalBudget: computedTotal
          };

          estimates.push(correctedResult);
      }

      // Calculate the grand total from the corrected estimates
      const grandTotal = estimates.reduce((sum, est) => sum + est.totalBudget, 0);
      
      setProjectEstimate({
        grandTotal,
        currency: estimates[0]?.currency || 'GHS',
        estimates
      });

      setAppState(AppState.RESULTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during analysis.");
      setAppState(AppState.ERROR);
    }
  };

  const handleAddManualItem = (fileId: string, item: MaterialItem) => {
    if (!projectEstimate) return;

    const updatedEstimates = projectEstimate.estimates.map(est => {
        if (est.fileId === fileId) {
            const totalPrice = item.quantity * item.unitPrice;
            const newItem = { ...item, totalPrice };
            const newBreakdown = [newItem, ...est.breakdown]; // Add to top
            
            // Recalc budget for this file
            const newTotal = newBreakdown.reduce((sum, i) => sum + i.totalPrice, 0);
            
            return { ...est, breakdown: newBreakdown, totalBudget: newTotal };
        }
        return est;
    });

    const newGrandTotal = updatedEstimates.reduce((sum, est) => sum + est.totalBudget, 0);

    setProjectEstimate({
        ...projectEstimate,
        estimates: updatedEstimates,
        grandTotal: newGrandTotal
    });
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setFiles([]);
    setProjectEstimate(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-neutral-100 bg-neutral-950 selection:bg-amber-500/30">
      
      {/* Navbar with Gold/Black Theme and Safe Area Padding */}
      <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform" onClick={resetApp} role="button">
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <HardHat className="text-amber-500 w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">DziVan <span className="text-amber-500">Smart</span></span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium text-neutral-400 hover:text-amber-400 transition-colors">Project History</a>
              <a href="#" className="text-sm font-medium text-neutral-400 hover:text-amber-400 transition-colors">Market Rates</a>
            </div>
            
            <div className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold uppercase tracking-wider">
               Free Edition
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto">
          
          {appState === AppState.ERROR && (
             <div className="mb-6 bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start justify-between shadow-sm">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-400">Analysis Failed</h3>
                    <div className="mt-2 text-sm text-red-300"><p>{error}</p></div>
                  </div>
                </div>
                <button onClick={() => setAppState(AppState.IDLE)} className="text-red-400 hover:text-red-300 font-bold text-sm">Retry</button>
             </div>
          )}

          {appState === AppState.IDLE && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="text-center mb-16 mt-8">
                <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-amber-500 text-xs font-bold tracking-widest uppercase">
                    Construction Intelligence
                </div>
                <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tight mb-6">
                  Estimate with <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">Precision & Style</span>
                </h1>
                <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                  Upload architectural drawings or site plans. We calculate materials, walls, and budgets using real-time market data.
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-3xl border border-neutral-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                   {/* Background Glow */}
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Upload Zone */}
                        <div className="h-full">
                            <div 
                              className={`h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 ease-in-out cursor-pointer relative active:scale-[0.99] ${
                                isDragging 
                                  ? 'border-amber-500 bg-amber-500/10' 
                                  : 'border-neutral-700 hover:border-amber-500/50 hover:bg-neutral-800'
                              }`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => !isProcessing && fileInputRef.current?.click()}
                            >
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                                <div className={`p-4 rounded-full mb-4 bg-neutral-800 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                                    <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-amber-400' : 'text-neutral-400'}`} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Upload Documents</h3>
                                <p className="text-sm text-neutral-500 mb-4">Drag & drop or click to browse</p>
                                <span className="text-xs text-neutral-600 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                                    PDF, JPG, PNG supported
                                </span>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf" 
                                multiple
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* File List & Action */}
                        <div className="flex flex-col h-full">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                                <span>Selected Files</span>
                                <span className="text-xs font-normal text-neutral-500">{files.length} files</span>
                            </h3>
                            
                            <div className="flex-grow bg-neutral-950 rounded-xl border border-neutral-800 p-4 mb-6 min-h-[180px] max-h-[250px] overflow-y-auto">
                                {files.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-sm italic">
                                        <FileIcon className="w-8 h-8 mb-2 opacity-20" />
                                        No files selected yet
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {files.map((f) => (
                                            <div key={f.id} className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800 group hover:border-neutral-700 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {f.mimeType === 'application/pdf' ? (
                                                        <div className="w-10 h-10 rounded bg-red-900/20 text-red-500 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold">PDF</span>
                                                        </div>
                                                    ) : (
                                                        <img src={f.previewUrl} alt="preview" className="w-10 h-10 rounded object-cover flex-shrink-0 border border-neutral-700" />
                                                    )}
                                                    <div className="truncate">
                                                        <p className="text-sm font-medium text-neutral-200 truncate max-w-[150px]">{f.name}</p>
                                                        <p className="text-xs text-neutral-500 uppercase">{f.mimeType.split('/')[1]}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeFile(f.id)} className="text-neutral-600 hover:text-red-500 transition-colors p-1 active:scale-95">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <Button 
                                    onClick={handleAnalyze} 
                                    disabled={files.length === 0} 
                                    className="w-full py-4 text-base shadow-xl shadow-amber-500/10 active:scale-[0.98]"
                                    variant="primary"
                                >
                                    Calculate Total Budget
                                </Button>
                            </div>
                        </div>
                   </div>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="text-amber-500 font-bold text-lg mb-1">Smart Wall Analysis</div>
                        <p className="text-xs text-neutral-500">Calculates blocks & cement automatically</p>
                    </div>
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="text-amber-500 font-bold text-lg mb-1">Multi-File Support</div>
                        <p className="text-xs text-neutral-500">Combine site plans and architectural drawings</p>
                    </div>
                    <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                        <div className="text-amber-500 font-bold text-lg mb-1">Market Trends</div>
                        <p className="text-xs text-neutral-500">Live price tracking for Ghana market</p>
                    </div>
                </div>
              </div>
            </div>
          )}

          {appState === AppState.ANALYZING && <AnalysisView />}

          {appState === AppState.RESULTS && projectEstimate && (
            <ResultView projectData={projectEstimate} onReset={resetApp} onAddItem={handleAddManualItem} />
          )}

        </div>
      </main>
      
      {/* Footer with Safe Area Bottom */}
      <footer className="bg-neutral-900 border-t border-neutral-800 mt-auto py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-neutral-500 text-sm">&copy; {new Date().getFullYear()} DziVan Smart. The Gold Standard in Estimation.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;