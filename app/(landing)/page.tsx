"use client"

import Link from "next/link"
import {
  Mic,
  Download,
  Volume2,
  Brain,
  Target,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Award,
  Play,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-50" />
              <div className="relative bg-gradient-to-br from-cyan-600 to-purple-600 p-2 rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight">AI Prospect Simulation</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">
              Testimonials
            </a>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-medium rounded-lg transition-all duration-300 glow-cyan"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-float-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm">
                <Zap className="w-4 h-4" />
                AI-Powered Sales Training
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-foreground">Master Your</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">
                  Cold Calls
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Practice with an intelligent AI prospect that responds like a real decision-maker. Get instant feedback,
                track your progress, and close more deals.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard"
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 glow-cyan"
                >
                  <Play className="w-5 h-5" />
                  Start Free Simulation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 bg-card hover:bg-card/80 text-foreground font-semibold rounded-xl border border-border hover:border-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  See How It Works
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Enterprise-grade security
                </div>
              </div>
            </div>

            {/* Right - Hero Visual */}
            <div className="relative animate-slide-in-right">
              <div className="relative">
                {/* Glowing backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />

                {/* Main card */}
                <div className="relative glass rounded-3xl p-8 border border-cyan-500/30">
                  {/* Mock simulator preview */}
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm text-cyan-300">Live Simulation</span>
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">02:34</div>
                    </div>

                    {/* Conversation preview */}
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="glass-purple rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                          <p className="text-sm text-foreground">
                            "I'm not sure we have the budget for this right now..."
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="glass-cyan rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
                          <p className="text-sm text-foreground">
                            "I understand budget concerns. What if I showed you how this pays for itself in 90 days?"
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <Mic className="w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    {/* Score preview */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-cyan-300">87%</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-300">A</div>
                          <div className="text-xs text-muted-foreground">Grade</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`w-2 h-8 rounded-full ${i <= 4 ? "bg-cyan-500" : "bg-border"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div
                  className="absolute -top-4 -right-4 glass px-4 py-2 rounded-xl border border-green-500/30 animate-float-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">+34% Close Rate</span>
                  </div>
                </div>

                <div
                  className="absolute -bottom-4 -left-4 glass px-4 py-2 rounded-xl border border-purple-500/30 animate-float-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Expert Level</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10,000+", label: "Sales Reps Trained", color: "text-cyan-300" },
              { value: "95%", label: "Satisfaction Rate", color: "text-purple-300" },
              { value: "2.5x", label: "Faster Ramp Time", color: "text-pink-300" },
              { value: "24/7", label: "Always Available", color: "text-green-300" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-4xl md:text-5xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300"> Excel</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete training platform designed to transform your sales team into top performers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Intelligent AI Prospect",
                description:
                  "Our AI responds with realistic objections, questions, and buying signals based on a sophisticated decision tree.",
                color: "cyan",
              },
              {
                icon: Mic,
                title: "Real-Time Voice",
                description:
                  "Practice with natural voice conversations. Speak like you would on a real call and get instant responses.",
                color: "purple",
              },
              {
                icon: Volume2,
                title: "Live Subtitles",
                description:
                  "Toggle subtitles on or off. Perfect for reviewing your technique and identifying areas for improvement.",
                color: "pink",
              },
              {
                icon: BarChart3,
                title: "Detailed Analytics",
                description:
                  "Track your performance across key metrics: objection handling, rapport building, closing techniques, and more.",
                color: "green",
              },
              {
                icon: Download,
                title: "Downloadable Reports",
                description: "Export comprehensive PDF reports to share with your team or keep for personal reference.",
                color: "orange",
              },
              {
                icon: Target,
                title: "Scenario Library",
                description:
                  "Access a variety of prospect personas and objection scenarios to prepare for any situation.",
                color: "blue",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`group relative glass rounded-2xl p-6 hover:border-${feature.color}-500/50 transition-all duration-300`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-${feature.color === "orange" ? "orange" : feature.color === "blue" ? "blue" : feature.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon
                    className={`w-6 h-6 text-${feature.color === "orange" ? "orange" : feature.color === "blue" ? "blue" : feature.color}-400`}
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300"> Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and see immediate improvement in your cold calling skills.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Start Your Call",
                description:
                  "Launch the simulator and begin speaking to our AI prospect. It responds just like a real decision-maker would.",
                icon: Play,
              },
              {
                step: "02",
                title: "Navigate the Conversation",
                description:
                  "Handle objections, build rapport, and work through the sales process. The AI adapts to your approach in real-time.",
                icon: MessageSquare,
              },
              {
                step: "03",
                title: "Get Your Report",
                description:
                  "Receive instant feedback with detailed scoring, specific mistakes, and actionable recommendations to improve.",
                icon: Award,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                )}

                <div className="relative glass rounded-2xl p-8 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-400 opacity-50">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-cyan-300" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Trusted by
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
                {" "}
                Top Performers
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what sales professionals are saying about AI Prospect Simulation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "This tool cut our new rep ramp time in half. They're hitting quota faster than ever before.",
                author: "Sarah Chen",
                role: "VP of Sales, TechCorp",
                avatar: "SC",
              },
              {
                quote:
                  "The AI feels incredibly realistic. It's helped me practice handling objections I'd never thought of.",
                author: "Marcus Johnson",
                role: "Enterprise AE, CloudScale",
                avatar: "MJ",
              },
              {
                quote: "The detailed reports helped me identify exactly where I was losing deals. Game changer.",
                author: "Emily Rodriguez",
                role: "SDR Team Lead, DataFlow",
                avatar: "ER",
              },
            ].map((testimonial, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
            <div className="relative glass rounded-3xl p-12 md:p-16 text-center border border-cyan-500/30">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to Transform Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
                  {" "}
                  Sales Skills?
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of sales professionals who are closing more deals with AI-powered training.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="group px-10 py-5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 glow-cyan text-lg"
                >
                  <Play className="w-5 h-5" />
                  Start Free Simulation
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Free to start
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  5-minute setup
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Secure & private
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-50" />
                <div className="relative bg-gradient-to-br from-cyan-600 to-purple-600 p-2 rounded-lg">
                  <Mic className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="font-bold">AI Prospect Simulation</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <div className="text-sm text-muted-foreground">© 2025 AI Prospect Simulation. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </main>
  )
}
