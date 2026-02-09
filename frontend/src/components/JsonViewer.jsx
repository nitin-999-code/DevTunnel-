/**
 * JsonViewer Component
 * 
 * Pretty-prints JSON data with syntax highlighting.
 * Handles both objects and strings.
 */

import React from 'react';

function JsonViewer({ data }) {
    // If data is a string, just display it
    if (typeof data === 'string') {
        return (
            <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
                {data}
            </pre>
        );
    }

    // Render JSON with proper formatting
    return (
        <pre className="font-mono text-sm overflow-auto">
            <JsonNode data={data} depth={0} />
        </pre>
    );
}

/**
 * Recursively renders a JSON node with syntax highlighting
 */
function JsonNode({ data, depth }) {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);

    // Handle null
    if (data === null) {
        return <span className="json-null">null</span>;
    }

    // Handle primitives
    if (typeof data === 'boolean') {
        return <span className="json-boolean">{data.toString()}</span>;
    }

    if (typeof data === 'number') {
        return <span className="json-number">{data}</span>;
    }

    if (typeof data === 'string') {
        // Truncate very long strings
        const displayValue = data.length > 500
            ? data.substring(0, 500) + '... (truncated)'
            : data;
        return <span className="json-string">"{displayValue}"</span>;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return <span className="text-gray-400">[]</span>;
        }

        return (
            <>
                <span className="text-gray-400">[</span>
                {'\n'}
                {data.map((item, index) => (
                    <span key={index}>
                        {nextIndent}
                        <JsonNode data={item} depth={depth + 1} />
                        {index < data.length - 1 && ','}
                        {'\n'}
                    </span>
                ))}
                {indent}<span className="text-gray-400">]</span>
            </>
        );
    }

    // Handle objects
    if (typeof data === 'object') {
        const entries = Object.entries(data);

        if (entries.length === 0) {
            return <span className="text-gray-400">{'{}'}</span>;
        }

        return (
            <>
                <span className="text-gray-400">{'{'}</span>
                {'\n'}
                {entries.map(([key, value], index) => (
                    <span key={key}>
                        {nextIndent}
                        <span className="json-key">"{key}"</span>
                        <span className="text-gray-400">: </span>
                        <JsonNode data={value} depth={depth + 1} />
                        {index < entries.length - 1 && ','}
                        {'\n'}
                    </span>
                ))}
                {indent}<span className="text-gray-400">{'}'}</span>
            </>
        );
    }

    // Fallback for unknown types
    return <span className="text-gray-500">{String(data)}</span>;
}

export default JsonViewer;
