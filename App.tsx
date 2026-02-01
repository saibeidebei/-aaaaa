
import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import { parseSRT, stringifySRT } from './utils/srtParser';
import { analyzeSubtitles } from './services/geminiService';
import { SubtitleBlock, ProcessStatus } from './types';

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<SubtitleBlock[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.srt')) {
      setError('请上传有效的 .srt 文件');
      return;
    }

    setFileName(file.name);
    setError(null);
    setStatus(ProcessStatus.PARSING);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsedBlocks = parseSRT(content);
        setBlocks(parsedBlocks);
        setStatus(ProcessStatus.IDLE);
      } catch (err) {
        setError('解析 SRT 文件失败。请确保文件格式正确。');
        setStatus(ProcessStatus.ERROR);
      }
    };
    reader.readAsText(file);
  };

  const processInChunks = async () => {
    if (blocks.length === 0) return;

    setStatus(ProcessStatus.ANALYZING);
    setProgress(0);
    setError(null);

    const chunkSize = 15; 
    const totalChunks = Math.ceil(blocks.length / chunkSize);
    const updatedBlocks = [...blocks];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const startIdx = i * chunkSize;
        const chunk = blocks.slice(startIdx, startIdx + chunkSize);
        
        const corrections = await analyzeSubtitles(chunk);
        
        corrections.forEach(corr => {
          const blockIdx = updatedBlocks.findIndex(b => b.index === corr.index);
          if (blockIdx !== -1) {
            updatedBlocks[blockIdx] = {
              ...updatedBlocks[blockIdx],
              text: corr.fixedText,
              isCorrected: true,
              correctionReason: corr.reason
            };
          }
        });

        setBlocks([...updatedBlocks]);
        setProgress(((i + 1) / totalChunks) * 100);
      }
      setStatus(ProcessStatus.COMPLETED);
    } catch (err) {
      console.error(err);
      setError('AI 分析过程中发生错误。请重试。');
      setStatus(ProcessStatus.ERROR);
    }
  };

  const downloadSRT = () => {
    const content = stringifySRT(blocks);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setBlocks([]);
    setStatus(ProcessStatus.IDLE);
    setProgress(0);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 md:p-8">
        {/* 上传区域 */}
        {blocks.length === 0 && status === ProcessStatus.IDLE && (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 shadow-xl max-w-2xl w-full text-center hover:border-indigo-400 transition-colors group">
              <div className="bg-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">上传您的 SRT 文件</h2>
              <p className="text-slate-500 mb-8">AI 将自动检测并修正语音识别（ASR）导出的文字错误。</p>
              
              <input
                type="file"
                accept=".srt"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="srt-upload"
              />
              <label
                htmlFor="srt-upload"
                className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 cursor-pointer shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                选取文件
              </label>
            </div>
          </div>
        )}

        {/* 操作栏与进度 */}
        {blocks.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                  {fileName}
                </h3>
                <p className="text-sm text-slate-500">已加载 {blocks.length} 条字幕块</p>
              </div>

              <div className="flex items-center gap-3">
                {status === ProcessStatus.IDLE && (
                  <button
                    onClick={processInChunks}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    开始 AI 纠错
                  </button>
                )}
                
                {status === ProcessStatus.COMPLETED && (
                  <button
                    onClick={downloadSRT}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载修复后的 SRT
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  重新开始
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            )}

            {/* 进度条 */}
            {status === ProcessStatus.ANALYZING && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">AI 正在分析上下文并修正错误...</span>
                  <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
                </div>
                <ProgressBar progress={progress} label="修正中" />
              </div>
            )}

            {/* 字幕列表 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-12 gap-4">
                <div className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider">#</div>
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">时间戳</div>
                <div className="col-span-9 text-xs font-bold text-slate-400 uppercase tracking-wider">字幕内容</div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {blocks.map((block) => (
                  <div key={block.id} className={`px-6 py-4 grid grid-cols-12 gap-4 items-start transition-colors ${block.isCorrected ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'}`}>
                    <div className="col-span-1 text-sm font-mono text-slate-400 pt-1">
                      {block.index}
                    </div>
                    <div className="col-span-2 text-[11px] font-mono text-slate-500 pt-1.5 whitespace-nowrap">
                      {block.startTime}
                      <br />
                      {block.endTime}
                    </div>
                    <div className="col-span-9 space-y-2">
                      <div className="flex flex-col gap-2">
                         {block.isCorrected && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-tight">原始文本</span>
                            <p className="text-sm text-slate-400 line-through italic">{block.originalText}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                           {block.isCorrected && <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold uppercase tracking-tight">AI 修复</span>}
                           <p className={`text-base font-medium ${block.isCorrected ? 'text-slate-800' : 'text-slate-600'}`}>
                             {block.text}
                           </p>
                        </div>
                      </div>
                      {block.correctionReason && (
                        <p className="text-xs text-indigo-500 font-medium italic flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          修正详情：{block.correctionReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="py-8 px-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        <p>© {new Date().getFullYear()} SubFix AI. 由 Gemini 3 Pro 强力驱动。</p>
      </footer>
    </div>
  );
};

export default App;
