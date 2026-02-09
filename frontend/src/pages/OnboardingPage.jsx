/**
 * DevTunnel+ Onboarding Flow
 * 
 * Interactive step-by-step onboarding:
 * - Install CLI
 * - Run tunnel command
 * - Open public URL
 * - View live traffic
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Terminal, Globe, Activity, Copy, Check,
    Lightbulb, Rocket, ArrowRight, CheckCircle
} from 'lucide-react';

const steps = [
    {
        id: 1,
        title: 'Install the CLI',
        description: 'Install DevTunnel CLI globally using npm or yarn',
        icon: <Package className="w-6 h-6 text-cyan-400" />,
        command: 'npm install -g @devtunnel/cli',
        hint: 'This installs the devtunnel command globally on your system'
    },
    {
        id: 2,
        title: 'Start your tunnel',
        description: 'Create a tunnel to your local development server',
        icon: <Terminal className="w-6 h-6 text-blue-400" />,
        command: 'devtunnel start 3000',
        hint: 'Replace 3000 with your local server port'
    },
    {
        id: 3,
        title: 'Open public URL',
        description: 'Access your tunnel from anywhere in the world',
        icon: <Globe className="w-6 h-6 text-green-400" />,
        output: `✔ Tunnel established!
→ Public URL: https://abc123.devtunnel.io
→ Forwarding to: http://localhost:3000
→ Dashboard: http://localhost:3002`,
        hint: 'Share this URL with teammates or use for webhooks'
    },
    {
        id: 4,
        title: 'View live traffic',
        description: 'Open the dashboard to inspect all requests in real-time',
        icon: <Activity className="w-6 h-6 text-purple-400" />,
        action: 'Open Dashboard',
        hint: 'Debug requests, replay with modifications, view metrics'
    }
];

// Animated checkmark
function CheckIcon({ completed }) {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: completed ? 1 : 0 }}
            className="absolute inset-0 flex items-center justify-center bg-green-500 rounded-full"
        >
            <Check className="w-6 h-6 text-white" />
        </motion.div>
    );
}

// Copy command button
function CopyCommand({ command }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-3 bg-dark-900 rounded-xl border border-dark-600 p-4 group">
            <code className="flex-1 font-mono text-cyan-400 text-lg">{command}</code>
            <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                          ${copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-500'}`}
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
            </motion.button>
        </div>
    );
}

// Terminal output display
function TerminalOutput({ output }) {
    return (
        <div className="bg-dark-900 rounded-xl border border-dark-600 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-dark-800 border-b border-dark-600">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <pre className="p-4 font-mono text-sm text-gray-300 whitespace-pre-line">
                {output}
            </pre>
        </div>
    );
}

// Progress bar
function ProgressBar({ current, total }) {
    const progress = ((current - 1) / (total - 1)) * 100;

    return (
        <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
        </div>
    );
}

// Step indicator dots
function StepIndicators({ steps, currentStep, completedSteps, onStepClick }) {
    return (
        <div className="flex justify-center gap-4">
            {steps.map((step) => (
                <button
                    key={step.id}
                    onClick={() => onStepClick(step.id)}
                    className="relative"
                >
                    <motion.div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                                  transition-all duration-300 relative overflow-hidden
                                  ${currentStep === step.id
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                                : completedSteps.includes(step.id)
                                    ? 'bg-green-500'
                                    : 'bg-dark-700 border-2 border-dark-500'}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {completedSteps.includes(step.id) ? (
                            <CheckIcon completed={true} />
                        ) : (
                            step.icon
                        )}
                    </motion.div>
                    {step.id < steps.length && (
                        <div className={`absolute top-1/2 left-full w-4 h-0.5 -translate-y-1/2
                                      ${completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-dark-600'}`} />
                    )}
                </button>
            ))}
        </div>
    );
}

// Main Onboarding Page
export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const navigate = useNavigate();

    const currentStepData = steps.find(s => s.id === currentStep);

    const handleComplete = () => {
        if (!completedSteps.includes(currentStep)) {
            setCompletedSteps([...completedSteps, currentStep]);
        }

        if (currentStep < steps.length) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(currentStep + 1);
                setIsAnimating(false);
            }, 300);
        } else {
            // All steps complete - go to dashboard
            navigate('/dashboard');
        }
    };

    const handleStepClick = (stepId) => {
        if (stepId <= Math.max(...completedSteps, currentStep)) {
            setCurrentStep(stepId);
        }
    };

    // Celebrate when all steps complete
    useEffect(() => {
        if (completedSteps.length === steps.length) {
            // Confetti effect or celebration
        }
    }, [completedSteps]);

    return (
        <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-dark-700">
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-cyan-500" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            DevTunnel+
                        </span>
                    </Link>
                    <Link
                        to="/dashboard"
                        className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
                    >
                        Skip to Dashboard <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-2xl">
                    {/* Title */}
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl font-bold mb-2">Get Started with DevTunnel+</h1>
                        <p className="text-gray-400">Set up your first tunnel in 4 easy steps</p>
                    </motion.div>

                    {/* Step Indicators */}
                    <div className="mb-12">
                        <StepIndicators
                            steps={steps}
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepClick={handleStepClick}
                        />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <ProgressBar current={currentStep} total={steps.length} />
                        <div className="flex justify-between mt-2 text-sm text-gray-500">
                            <span>Step {currentStep} of {steps.length}</span>
                            <span>{Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}% Complete</span>
                        </div>
                    </div>

                    {/* Step Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-dark-800 rounded-2xl border border-dark-600 p-8"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 
                                              border border-cyan-500/30 flex items-center justify-center text-2xl">
                                    {currentStepData.icon}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold mb-1">
                                        {currentStepData.title}
                                    </h2>
                                    <p className="text-gray-400">
                                        {currentStepData.description}
                                    </p>
                                </div>
                            </div>

                            {/* Command to copy */}
                            {currentStepData.command && (
                                <div className="mb-6">
                                    <CopyCommand command={currentStepData.command} />
                                </div>
                            )}

                            {/* Terminal output */}
                            {currentStepData.output && (
                                <div className="mb-6">
                                    <TerminalOutput output={currentStepData.output} />
                                </div>
                            )}

                            {/* Hint */}
                            <div className="flex items-start gap-2 text-sm text-gray-400 mb-6 
                                          bg-dark-700/50 rounded-lg p-3">
                                <Lightbulb className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                <span>{currentStepData.hint}</span>
                            </div>

                            {/* Action button */}
                            <div className="flex gap-4">
                                {currentStep > 1 && (
                                    <button
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        className="px-6 py-3 bg-dark-700 border border-dark-500 rounded-xl
                                                 hover:bg-dark-600 transition-colors"
                                    >
                                        ← Back
                                    </button>
                                )}
                                <motion.button
                                    onClick={handleComplete}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 
                                             rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25
                                             transition-all duration-300"
                                >
                                    {currentStepData.action || (currentStep === steps.length ? 'Finish Setup 🎉' : 'Continue →')}
                                </motion.button>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Success state */}
                    {completedSteps.length === steps.length && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8 text-center"
                        >
                            <div className="flex justify-center mb-4">
                                <Rocket className="w-20 h-20 text-cyan-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">You're all set!</h3>
                            <p className="text-gray-400 mb-6">
                                Your tunnel is ready. Head to the dashboard to start debugging.
                            </p>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 
                                         rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25
                                         transition-all duration-300"
                            >
                                <Activity className="w-5 h-5" /> Open Dashboard
                            </Link>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-dark-700 py-6 px-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-gray-500">
                    <span>Need help? Check out the <Link to="/docs" className="text-cyan-400 hover:underline">Documentation</Link></span>
                    <span>© 2026 DevTunnel+</span>
                </div>
            </footer>
        </div>
    );
}
