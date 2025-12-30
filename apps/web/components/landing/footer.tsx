import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

interface FooterProps {
  className?: string;
}

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#stats" },
    { label: "API", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "Status", href: "#" },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Security", href: "#" },
    { label: "Cookies", href: "#" },
  ],
};

const socialLinks = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn("border-border/40 border-t bg-background", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-1">
            <Link className="flex items-center space-x-2" href="/">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.7_0.15_260)] to-[oklch(0.65_0.12_320)]">
                <span className="font-bold text-lg text-white">A</span>
              </div>
              <span className="font-bold text-xl">AppName</span>
            </Link>
            <p className="mt-4 text-muted-foreground text-sm">
              Building the future of collaboration, one feature at a time.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    aria-label={social.label}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    href={social.href}
                    key={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-sm">Product</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-sm">Company</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold text-sm">Resources</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-sm">Legal</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Copyright */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} AppName. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Built with Next.js and Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
