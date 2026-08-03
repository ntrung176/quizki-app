import React from 'react';

class PrintErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("PrintErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 border-2 border-red-500 bg-red-50 rounded-xl text-red-800 font-sans my-4">
                    <h3 className="font-bold text-base mb-2">⚠️ Lỗi hiển thị bản in (Print Render Error)</h3>
                    <p className="text-xs mb-3 font-medium text-red-700">Mã nguồn gặp lỗi khi cố gắng hiển thị đáp án hoặc phiếu trả lời. Chi tiết lỗi:</p>
                    <pre className="p-3 bg-red-100 rounded text-[11px] font-mono overflow-auto max-h-40 whitespace-pre-wrap text-red-900 border border-red-200">
                        {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
                    </pre>
                    <button 
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                        Thử lại (Retry)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default PrintErrorBoundary;
