/**
 * JsonEditor Component
 * 
 * Simple JSON editor with validation:
 * - Textarea input
 * - Format/prettify button
 * - Validation feedback
 */

import React, { useState, useEffect } from 'react';
import { Check, X, AlignLeft, Minimize2, Copy } from 'lucide-react';

function JsonEditor({ value, onChange }) {
    // Convert value to string for editing
    const [text, setText] = useState('');
    const [isValid, setIsValid] = useState(true);
    const [error, setError] = useState(null);

    // Initialize text from value
    useEffect(() => {
        if (value === null || value === undefined) {
            setText('');
        } else if (typeof value === 'string') {
            setText(value);
        } else {
            setText(JSON.stringify(value, null, 2));
        }
    }, []);

    /**
     * Handle text changes
     */
    const handleChange = (newText) => {
        setText(newText);

        // Try to parse and validate
        if (newText.trim() === '') {
            setIsValid(true);
            setError(null);
            onChange(null);
            return;
        }

        try {
            const parsed = JSON.parse(newText);
            setIsValid(true);
            setError(null);
            onChange(parsed);
        } catch (e) {
            setIsValid(false);
            setError(e.message);
            // Still pass the raw text
            onChange(newText);
        }
    };

    /**
     * Format/prettify JSON
     */
    const handleFormat = () => {
        try {
            const parsed = JSON.parse(text);
            const formatted = JSON.stringify(parsed, null, 2);
            setText(formatted);
            setIsValid(true);
            setError(null);
        } catch (e) {
            setError('Cannot format: Invalid JSON');
        }
    };

    /**
     * Minify JSON
     */
    const handleMinify = () => {
        try {
            const parsed = JSON.parse(text);
            const minified = JSON.stringify(parsed);
            setText(minified);
            setIsValid(true);
            setError(null);
        } catch (e) {
            setError('Cannot minify: Invalid JSON');
        }
    };

    return (
        <div className="space-y-2 bg-dark-800 p-2 rounded-lg border border-dark-600">
            {/* Toolbar */}
            <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-dark-700">
                <button
                    onClick={handleFormat}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                >
                    <AlignLeft className="w-3 h-3" />
                    Format
                </button>
                <button
                    onClick={handleMinify}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                >
                    <Minimize2 className="w-3 h-3" />
                    Minify
                </button>

                <div className="ml-auto flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded ${isValid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {isValid ? 'Valid JSON' : 'Invalid JSON'}
                    </span>
                </div>
            </div>

            {/* Editor */}
            <div className="relative group">
                <textarea
                    value={text}
                    onChange={(e) => handleChange(e.target.value)}
                    className={`
                        w-full h-40 bg-dark-900/50 text-gray-300 font-mono text-sm
                        p-3 rounded-lg resize-none
                        border transition-all duration-200
                        ${isValid
                            ? 'border-dark-700 focus:border-blue-500/50 focus:bg-dark-900 focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                            : 'border-red-500/30 bg-red-500/5 focus:border-red-500/50'
                        }
                        focus:outline-none placeholder-gray-600
                    `}
                    placeholder='{ "key": "value" }'
                    spellCheck={false}
                />
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10 animate-in fade-in slide-in-from-top-1">
                    <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="font-mono">{error}</span>
                </div>
            )}
        </div>
    );
}

export default JsonEditor;
