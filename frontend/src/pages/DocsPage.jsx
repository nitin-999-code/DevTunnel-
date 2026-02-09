/**
 * DevTunnel+ Documentation
 * 
 * Full documentation experience with:
 * - Sidebar navigation
 * - Code blocks with copy
 * - Terminal examples
 * - Step-by-step tutorials
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket, Package, Terminal, Keyboard, Webhook, Lock, Clock, Wrench,
    Copy, Check, Activity, BookOpen, ChevronRight, FileText
} from 'lucide-react';

// Documentation sections
const docSections = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <Rocket className="w-5 h-5" />,
        content: {
            title: 'Getting Started with DevTunnel+',
            description: 'Learn how to expose your local development server to the internet in under 30 seconds.',
            sections: [
                {
                    title: 'What is DevTunnel+?',
                    content: `DevTunnel+ is a powerful tunneling tool that allows you to expose your local development server to the internet. 
                    
It provides:
• **Secure tunnels** with automatic HTTPS
• **Real-time traffic inspection** for debugging
• **Request replay** with modifications
• **Webhook reliability** with retries
• **Metrics and analytics** dashboard`
                },
                {
                    title: 'Quick Start',
                    content: 'Get up and running in 3 simple steps:',
                    steps: [
                        'Install the CLI globally',
                        'Start a tunnel to your local port',
                        'Share your public URL'
                    ]
                }
            ]
        }
    },
    {
        id: 'install-cli',
        title: 'Install CLI',
        icon: <Package className="w-5 h-5" />,
        content: {
            title: 'Installing the DevTunnel CLI',
            description: 'The DevTunnel CLI is the main way to create and manage tunnels.',
            sections: [
                {
                    title: 'Using npm (recommended)',
                    code: {
                        language: 'bash',
                        content: 'npm install -g @devtunnel/cli'
                    }
                },
                {
                    title: 'Using yarn',
                    code: {
                        language: 'bash',
                        content: 'yarn global add @devtunnel/cli'
                    }
                },
                {
                    title: 'Verify installation',
                    code: {
                        language: 'bash',
                        content: `devtunnel --version
# Output: devtunnel v2.0.0`
                    }
                }
            ]
        }
    },
    {
        id: 'create-tunnel',
        title: 'Create Tunnel',
        icon: <Terminal className="w-5 h-5" />,
        content: {
            title: 'Creating Your First Tunnel',
            description: 'Expose your local server with a simple command.',
            sections: [
                {
                    title: 'Basic usage',
                    content: 'Start a tunnel to any local port:',
                    code: {
                        language: 'bash',
                        content: `# Expose localhost:3000
devtunnel start 3000

# Output:
# ✔ Tunnel established!
# → Public URL: https://abc123.devtunnel.io
# → Forwarding to: http://localhost:3000`
                    }
                },
                {
                    title: 'Custom subdomain',
                    content: 'Request a specific subdomain (premium feature):',
                    code: {
                        language: 'bash',
                        content: 'devtunnel start 3000 --subdomain myapp'
                    }
                },
                {
                    title: 'Multiple tunnels',
                    content: 'Run multiple tunnels simultaneously:',
                    code: {
                        language: 'bash',
                        content: `# Terminal 1
devtunnel start 3000

# Terminal 2
devtunnel start 8080`
                    }
                }
            ]
        }
    },
    {
        id: 'cli-commands',
        title: 'CLI Commands',
        icon: <Keyboard className="w-5 h-5" />,
        content: {
            title: 'CLI Command Reference',
            description: 'Complete list of available CLI commands.',
            sections: [
                {
                    title: 'devtunnel start <port>',
                    content: 'Start a new tunnel to the specified port.',
                    code: {
                        language: 'bash',
                        content: `devtunnel start 3000 [options]

Options:
  --subdomain, -s    Request specific subdomain
  --host, -h         Local host to forward (default: localhost)
  --inspect, -i      Enable traffic inspection
  --no-color         Disable colored output`
                    }
                },
                {
                    title: 'devtunnel list',
                    content: 'List all active tunnels.',
                    code: {
                        language: 'bash',
                        content: `devtunnel list

# Output:
# ID          SUBDOMAIN     PORT    STATUS    UPTIME
# abc123      myapp         3000    active    2h 15m
# def456      api-test      8080    active    45m`
                    }
                },
                {
                    title: 'devtunnel stop <id>',
                    content: 'Stop a specific tunnel by ID.',
                    code: {
                        language: 'bash',
                        content: 'devtunnel stop abc123'
                    }
                }
            ]
        }
    },
    {
        id: 'webhooks',
        title: 'Webhooks Setup',
        icon: <Webhook className="w-5 h-5" />,
        content: {
            title: 'Testing Webhooks Locally',
            description: 'Debug Stripe, GitHub, Slack, and other webhooks on your local machine.',
            sections: [
                {
                    title: 'Why use DevTunnel for webhooks?',
                    content: `When developing integrations with third-party services, webhooks need a public URL to deliver events. DevTunnel+ provides:

• **Instant public URL** - No deployment needed
• **Request inspection** - See full payloads
• **Replay capability** - Re-test without triggering real events
• **Reliable delivery** - Automatic retries and dead letter queue`
                },
                {
                    title: 'Stripe webhook example',
                    code: {
                        language: 'bash',
                        content: `# 1. Start your local server
npm run dev  # Running on localhost:3000

# 2. Create tunnel
devtunnel start 3000
# → https://abc123.devtunnel.io

# 3. Add to Stripe Dashboard
# Webhook URL: https://abc123.devtunnel.io/webhook/stripe

# 4. Open dashboard to inspect events
open http://localhost:3002`
                    }
                }
            ]
        }
    },
    {
        id: 'security',
        title: 'Security & Auth',
        icon: <Lock className="w-5 h-5" />,
        content: {
            title: 'Security & Authentication',
            description: 'Protect your tunnels with authentication and access controls.',
            sections: [
                {
                    title: 'API Key Authentication',
                    content: 'Secure your tunnel with an API key:',
                    code: {
                        language: 'bash',
                        content: `# Get your development API key
curl http://localhost:3000/api/auth/key

# Use in requests
curl -H "X-API-Key: dev_xxx..." https://abc123.devtunnel.io/api`
                    }
                },
                {
                    title: 'IP Whitelisting',
                    content: 'Restrict access to specific IP addresses:',
                    code: {
                        language: 'bash',
                        content: `# Whitelist an IP
curl -X POST http://localhost:3000/api/security/whitelist \\
  -H "Content-Type: application/json" \\
  -d '{"ip": "203.0.113.50"}'`
                    }
                },
                {
                    title: 'Rate Limiting',
                    content: 'DevTunnel+ includes built-in rate limiting to protect your local server from abuse. Default limits are 100 requests/minute for API endpoints and 200 requests/minute for tunnel traffic.'
                }
            ]
        }
    },
    {
        id: 'rate-limits',
        title: 'Rate Limits',
        icon: <Clock className="w-5 h-5" />,
        content: {
            title: 'Rate Limits & Quotas',
            description: 'Understanding request limits and how to handle them.',
            sections: [
                {
                    title: 'Default Limits',
                    content: `| Endpoint Type | Limit |
|--------------|-------|
| API Requests | 100/min |
| Tunnel Traffic | 200/min |
| WebSocket Messages | 1000/min |
| Webhook Deliveries | 50/min |`
                },
                {
                    title: 'Rate Limit Headers',
                    content: 'Every response includes rate limit information:',
                    code: {
                        language: 'http',
                        content: `X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200`
                    }
                }
            ]
        }
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: <Wrench className="w-5 h-5" />,
        content: {
            title: 'Troubleshooting Guide',
            description: 'Common issues and how to resolve them.',
            sections: [
                {
                    title: 'Tunnel not connecting',
                    content: `**Problem:** Tunnel fails to establish connection.

**Solutions:**
1. Check if the gateway server is running
2. Verify your network allows WebSocket connections
3. Try a different port if default is blocked

\`\`\`bash
# Check gateway health
curl http://localhost:3000/health
\`\`\``
                },
                {
                    title: 'Requests timing out',
                    content: `**Problem:** Requests through tunnel are slow or timeout.

**Solutions:**
1. Check your local server is responding
2. Reduce payload sizes if possible
3. Check for rate limiting`
                },
                {
                    title: 'Port already in use',
                    content: 'Kill the process using the port:',
                    code: {
                        language: 'bash',
                        content: `# Find process
lsof -i :3000

# Kill it
kill -9 <PID>`
                    }
                }
            ]
        }
    }
];

// Code Block component with copy functionality
function CodeBlock({ language, content }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5
                              ${copied
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 border border-dark-500'}`}
                >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="bg-dark-900 rounded-xl border border-dark-600 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 border-b border-dark-600">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-2 text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Terminal className="w-3 h-3" /> {language}
                    </span>
                </div>
                <pre className="p-4 overflow-x-auto">
                    <code className="text-sm font-mono text-gray-300 whitespace-pre">
                        {content}
                    </code>
                </pre>
            </div>
        </div>
    );
}

// Sidebar navigation
function DocsSidebar({ sections, activeSection, onSelect }) {
    return (
        <nav className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3 flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Documentation
                </div>
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => onSelect(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                                  ${activeSection === section.id
                                ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                                : 'text-gray-400 hover:text-white hover:bg-dark-700 border-l-2 border-transparent'}`}
                    >
                        <span className={`${activeSection === section.id ? 'text-cyan-400' : 'text-gray-500'}`}>
                            {section.icon}
                        </span>
                        <span className="text-sm font-medium">{section.title}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

// Main content area
function DocsContent({ section }) {
    if (!section) return null;

    const { content } = section;

    return (
        <motion.div
            key={section.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 max-w-3xl"
        >
            <div className="mb-8 border-b border-dark-700 pb-8">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-dark-800 border border-dark-600 text-cyan-400">
                    {section.icon}
                </div>
                <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
                <p className="text-xl text-gray-400">{content.description}</p>
            </div>

            <div className="space-y-12">
                {content.sections.map((item, i) => (
                    <div key={i} className="space-y-4">
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            {item.title}
                        </h2>

                        {item.content && (
                            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {item.content}
                            </div>
                        )}

                        {item.steps && (
                            <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-600/50">
                                <ol className="space-y-4">
                                    {item.steps.map((step, j) => (
                                        <li key={j} className="flex gap-4">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">
                                                {j + 1}
                                            </span>
                                            <span className="text-gray-300">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {item.code && (
                            <CodeBlock
                                language={item.code.language}
                                content={item.code.content}
                            />
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// Main Documentation Page
export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('getting-started');
    const currentSection = docSections.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen bg-dark-900 text-gray-100">
            {/* Top Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-cyan-500" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            DevTunnel+
                        </span>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-400 font-medium">Docs</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="px-4 py-2 bg-dark-700 border border-dark-500 rounded-lg text-sm text-gray-300
                                     hover:bg-dark-600 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Activity className="w-4 h-4" /> Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-24 pb-16 px-6">
                <div className="max-w-7xl mx-auto flex gap-12">
                    {/* Sidebar */}
                    <DocsSidebar
                        sections={docSections}
                        activeSection={activeSection}
                        onSelect={setActiveSection}
                    />

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        <DocsContent section={currentSection} />
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
