import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border px-6 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p>&copy; {year} Family Space. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          <a
            href="mailto:usmansagemode@gmail.com"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
