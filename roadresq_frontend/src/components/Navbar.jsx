import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./ui/Logo";
import Button from "./ui/Button";
import { Avatar, ConnectionStatus } from "./ui/Misc";
import NotificationBell from "./NotificationPanel";

const LINKS = {
  guest: [
    { to: "/#how-it-works", label: "How it works" },
    { to: "/#services", label: "Services" },
    { to: "/#safety", label: "Safety" },
  ],
  user: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/my-requests", label: "My requests" },
  ],
  mechanic: [{ to: "/dashboard/mechanic", label: "Operations" }],
};

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const role = user?.role === "mechanic" ? "mechanic" : user ? "user" : "guest";
  const links = LINKS[role];

  // Close menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-[1000] border-b border-white/5 bg-ink-950/95 backdrop-blur supports-[backdrop-filter]:bg-ink-950/85">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo to={user ? (role === "mechanic" ? "/dashboard/mechanic" : "/dashboard") : "/"} />

        <div className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((l) =>
            l.to.includes("#") ? (
              <Link key={l.to} to={l.to} className={linkClass({ isActive: false })}>
                {l.label}
              </Link>
            ) : (
              <NavLink key={l.to} to={l.to} end className={linkClass}>
                {l.label}
              </NavLink>
            )
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <span className="hidden lg:inline-flex">
                <ConnectionStatus dark />
              </span>
              <span className="lg:hidden">
                <ConnectionStatus dark showLabel={false} />
              </span>
              {role === "user" && (
                <Button to="/help" size="sm" icon={Plus} className="hidden sm:inline-flex">
                  Request help
                </Button>
              )}
              <NotificationBell />

              <div ref={menuRef} className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-ink-200 hover:bg-white/10"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  <Avatar name={user.name} size="sm" tone={role === "mechanic" ? "volt" : "signal"} />
                  <ChevronDown size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white text-ink-900 shadow-lift animate-slide-down">
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                      <p className="mt-1 text-xs font-medium capitalize text-signal-600">
                        {role === "mechanic" ? "Mechanic" : "Customer"}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button to="/login" variant="ghost" size="sm" className="!text-ink-200 hover:!bg-white/10">
                Log in
              </Button>
              <Button to="/register" size="sm">
                Get started
              </Button>
            </div>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-200 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/5 bg-ink-950 px-4 pb-5 pt-2 md:hidden animate-slide-down">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              <Avatar name={user.name} tone={role === "mechanic" ? "volt" : "signal"} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{user.name}</p>
                <p className="text-xs text-ink-300">{role === "mechanic" ? "Mechanic" : "Customer"}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `rounded-xl px-3 py-3 text-base font-medium ${
                    isActive && !l.to.includes("#") ? "bg-white/10 text-white" : "text-ink-200"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            {role === "user" && (
              <Button to="/help" size="lg" icon={Plus} full>
                Request help
              </Button>
            )}
            {user ? (
              <Button onClick={handleLogout} variant="glass" size="lg" icon={LogOut} full>
                Log out
              </Button>
            ) : (
              <>
                <Button to="/register" size="lg" full>
                  Get started
                </Button>
                <Button to="/login" variant="glass" size="lg" full>
                  Log in
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
