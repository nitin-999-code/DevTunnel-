/**
 * DevTunnel+ Landing Page
 * 
 * Premium SaaS landing page with:
 * - Hero section with value proposition
 * - Feature showcase
 * - Architecture flow
 * - Use cases
 * - Call-to-action
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Shield, Search, RotateCcw, BarChart2, Link as LinkIcon, Zap,
    Webhook, Globe, TestTube, Smartphone, Rocket, BookOpen,
    Server, Radio, Laptop, ArrowRight, CheckCircle, Activity,
    Terminal, Code
} from 'lucide-react';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const floatAnimation = {
    initial: { y: 0 },
    animate: {
        y: [-10, 10, -10],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    }
};

// Feature data
const features = [
    {
        icon: <Shield className="w-8 h-8 text-white" />,
        title: 'Secure Tunnels',
        description: 'End-to-end encrypted connections with automatic HTTPS support and custom authentication.',
        gradient: 'from-cyan-500 to-blue-500'
    },
    {
        icon: <Search className="w-8 h-8 text-white" />,
        title: 'Live Traffic Inspector',
        description: 'Real-time request/response inspection with full payload visibility and search.',
        gradient: 'from-purple-500 to-pink-500'
    },
    {
        icon: <RotateCcw className="w-8 h-8 text-white" />,
        title: 'Replay Debugging',
        description: 'Capture and replay any request with modifications. Compare original vs replayed responses.',
        gradient: 'from-green-500 to-emerald-500'
    },
    {
        icon: <BarChart2 className="w-8 h-8 text-white" />,
        title: 'Metrics & Heatmaps',
        description: 'Visualize traffic patterns, latency percentiles, and throughput with live charts.',
        gradient: 'from-orange-500 to-red-500'
    },
    {
        icon: <LinkIcon className="w-8 h-8 text-white" />,
        title: 'Webhook Reliability',
        description: 'Never miss a webhook. Automatic retries, dead letter queue, and delivery tracking.',
        gradient: 'from-indigo-500 to-purple-500'
    },
    {
        icon: <Zap className="w-8 h-8 text-white" />,
        title: 'Blazing Fast',
        description: 'Sub-millisecond latency with WebSocket-powered real-time streaming.',
        gradient: 'from-yellow-500 to-orange-500'
    }
];

const useCases = [
    {
        icon: <Webhook className="w-12 h-12 text-cyan-400 mb-4 mx-auto" />,
        title: 'Webhook Development',
        description: 'Test Stripe, GitHub, Slack webhooks locally without deploying'
    },
    {
        icon: <Globe className="w-12 h-12 text-purple-400 mb-4 mx-auto" />,
        title: 'Frontend Preview',
        description: 'Share your localhost with clients, teammates, or on mobile devices'
    },
    {
        icon: <TestTube className="w-12 h-12 text-green-400 mb-4 mx-auto" />,
        title: 'API Testing',
        description: 'Debug third-party integrations with full request inspection'
    },
    {
        icon: <Smartphone className="w-12 h-12 text-orange-400 mb-4 mx-auto" />,
        title: 'Mobile Development',
        description: 'Test mobile apps against your local backend servers'
    }
];

// Terminal typing animation (kept largely same but removed colorful emoji if any)
function TerminalDemo() {
    const [step, setStep] = useState(0);
    const commands = [
        { prompt: '$ ', text: 'npm install -g devtunnel', delay: 2000 },
        { prompt: '$ ', text: 'devtunnel start 3000', delay: 2500 },
        { prompt: '✓ ', text: 'Tunnel established!', delay: 1500 },
        { prompt: '→ ', text: 'https://abc123.devtunnel.io', delay: 0, highlight: true }
    ];

    useEffect(() => {
        if (step < commands.length - 1) {
            const timer = setTimeout(() => setStep(s => s + 1), commands[step].delay);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setStep(0), 4000);
            return () => clearTimeout(timer);
        }
    }, [step, commands]);

    return (
        <motion.div
            className="bg-dark-900 rounded-xl border border-dark-600 overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <div className="flex items-center gap-2 px-4 py-3 bg-dark-800 border-b border-dark-600">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-gray-500 text-sm font-mono flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> bash
                </span>
            </div>
            <div className="p-6 font-mono text-sm space-y-2 min-h-[180px]">
                {commands.slice(0, step + 1).map((cmd, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cmd.highlight ? 'text-cyan-400 font-bold' : 'text-gray-300'}
                    >
                        <span className="text-gray-500">{cmd.prompt}</span>
                        {cmd.text}
                        {i === step && !cmd.highlight && (
                            <span className="animate-pulse ml-1">▋</span>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// Architecture flow diagram
function ArchitectureFlow() {
    const nodes = [
        { label: 'Browser', icon: <Globe className="w-6 h-6" />, color: 'cyan' },
        { label: 'Gateway', icon: <Server className="w-6 h-6" />, color: 'purple' },
        { label: 'WebSocket', icon: <Radio className="w-6 h-6" />, color: 'green' },
        { label: 'Localhost', icon: <Laptop className="w-6 h-6" />, color: 'orange' }
    ];

    return (
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
            {nodes.map((node, i) => (
                <div key={i} className="flex items-center gap-4 md:gap-8">
                    <motion.div
                        className={`px-6 py-4 rounded-xl bg-dark-800 border border-dark-600 
                                   shadow-lg hover:shadow-${node.color}-500/20 transition-all duration-300
                                   flex items-center gap-3`}
                        whileHover={{ scale: 1.05, y: -5 }}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <span className={`text-${node.color}-400`}>{node.icon}</span>
                        <span className="text-lg font-medium text-gray-200">{node.label}</span>
                    </motion.div>
                    {i < nodes.length - 1 && (
                        <motion.div
                            className="text-cyan-400 hidden md:block"
                            animate={{ x: [0, 10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </motion.div>
                    )}
                </div>
            ))}
        </div>
    );
}

// Main Landing Page
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-dark-900 text-gray-100">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <Activity className="w-8 h-8 text-cyan-500" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            DevTunnel+
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/docs" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Docs
                        </Link>
                        <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                            Features
                        </a>
                        <a href="#use-cases" className="text-gray-400 hover:text-white transition-colors">
                            Use Cases
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg 
                                     font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300
                                     hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <Activity className="w-4 h-4" /> Open Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Text content */}
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.div
                                variants={fadeInUp}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 
                                         rounded-full text-cyan-400 text-sm mb-6"
                            >
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                Now with Live Diff Replay
                            </motion.div>

                            <motion.h1
                                variants={fadeInUp}
                                className="text-5xl md:text-6xl font-bold leading-tight mb-6"
                            >
                                Expose local apps{' '}
                                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                                    instantly
                                </span>{' '}
                                with real-time debugging
                            </motion.h1>

                            <motion.p
                                variants={fadeInUp}
                                className="text-xl text-gray-400 mb-8 max-w-xl"
                            >
                                Create secure tunnels to your localhost. Inspect every request.
                                Replay with modifications. Debug webhooks like never before.
                            </motion.p>

                            <motion.div
                                variants={fadeInUp}
                                className="flex flex-wrap gap-4"
                            >
                                <Link
                                    to="/onboarding"
                                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl 
                                             font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 
                                             transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
                                >
                                    <Rocket className="w-5 h-5" /> Start Tunneling
                                </Link>
                                <Link
                                    to="/docs"
                                    className="px-8 py-4 bg-dark-700 border border-dark-500 rounded-xl 
                                             font-semibold text-lg hover:bg-dark-600 hover:border-cyan-500/50
                                             transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
                                >
                                    <BookOpen className="w-5 h-5" /> View Docs
                                </Link>
                            </motion.div>

                            {/* Stats */}
                            <motion.div
                                variants={fadeInUp}
                                className="flex gap-8 mt-12 pt-8 border-t border-dark-700"
                            >
                                <div>
                                    <div className="flex items-center gap-2 text-3xl font-bold text-cyan-400">
                                        <Zap className="w-6 h-6" /> 10ms
                                    </div>
                                    <div className="text-gray-500">Avg Latency</div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-3xl font-bold text-purple-400">
                                        <Globe className="w-6 h-6" /> ∞
                                    </div>
                                    <div className="text-gray-500">Tunnels</div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-3xl font-bold text-green-400">
                                        <Code className="w-6 h-6" /> 100%
                                    </div>
                                    <div className="text-gray-500">Open Source</div>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Right: Terminal demo */}
                        <motion.div {...floatAnimation}>
                            <TerminalDemo />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 bg-dark-800/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl font-bold mb-4">
                            Everything you need for{' '}
                            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                local development
                            </span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            DevTunnel+ provides the complete debugging toolkit for modern developers
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                className="p-6 bg-dark-800 rounded-2xl border border-dark-600 
                                         hover:border-dark-500 transition-all duration-300 group"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -5 }}
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} 
                                               flex items-center justify-center text-2xl mb-4
                                               group-hover:scale-110 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-gray-400">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Architecture Section */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl font-bold mb-4">How it works</h2>
                        <p className="text-xl text-gray-400">
                            Simple architecture, powerful capabilities
                        </p>
                    </motion.div>

                    <ArchitectureFlow />

                    <motion.div
                        className="mt-16 p-8 bg-dark-800 rounded-2xl border border-dark-600 max-w-3xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="grid md:grid-cols-3 gap-6 text-center">
                            <div>
                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                                <h4 className="font-semibold mb-1">Start Tunnel</h4>
                                <p className="text-sm text-gray-400">Run CLI on your machine</p>
                            </div>
                            <div>
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                                <h4 className="font-semibold mb-1">Get Public URL</h4>
                                <p className="text-sm text-gray-400">Instant unique subdomain</p>
                            </div>
                            <div>
                                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                                <h4 className="font-semibold mb-1">Debug Live</h4>
                                <p className="text-sm text-gray-400">Inspect & replay requests</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section id="use-cases" className="py-24 px-6 bg-dark-800/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl font-bold mb-4">Built for developers</h2>
                        <p className="text-xl text-gray-400">
                            Common scenarios where DevTunnel+ shines
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {useCases.map((useCase, i) => (
                            <motion.div
                                key={i}
                                className="p-6 bg-dark-800 rounded-2xl border border-dark-600 text-center
                                         hover:border-cyan-500/50 transition-all duration-300"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                            >
                                <div className="flex justify-center">{useCase.icon}</div>
                                <h3 className="text-lg font-semibold mb-2">{useCase.title}</h3>
                                <p className="text-sm text-gray-400">{useCase.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <motion.div
                    className="max-w-4xl mx-auto text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Ready to supercharge your{' '}
                        <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                            local development?
                        </span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-8">
                        Get started in under 30 seconds. No account required.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/onboarding"
                            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl 
                                     font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 
                                     transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
                        >
                            <Rocket className="w-5 h-5" /> Start Tunneling Free
                        </Link>
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-dark-700 border border-dark-500 rounded-xl 
                                     font-semibold text-lg hover:bg-dark-600 transition-all duration-300 flex items-center gap-2"
                        >
                            <Code className="w-5 h-5" /> Star on GitHub
                        </a>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-dark-700">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6">
                    <div className="text-gray-500 flex items-center gap-2">
                        © 2026 DevTunnel+. Built with <span className="text-blue-500">💙</span> for developers.
                    </div>
                    <div className="flex gap-6 text-gray-400">
                        <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
                        <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
