import { Link } from 'react-router'; // Import Link for navigation

import logoDark from "./talson-logo-dark.svg";
import logoLight from "./talson-logo-light.svg";

export function Welcome() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-black dark:bg-black">
      <div className="flex flex-col items-center gap-8"> {/* Adjusted gap */}
        <div className="w-[300px] max-w-[100vw] p-4"> {/* Adjusted width */}
          <img
            src={logoLight}
            alt="React Router"
            className="block w-full dark:hidden"
          />
          <img
            src={logoDark}
            alt="React Router"
            className="hidden w-full dark:block"
          />
        </div>

        <div className="w-full max-w-[300px] space-y-4 px-4"> {/* Adjusted max-width and space */}
          <Link to="/register" className="block w-full text-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900">
            Sign Up
          </Link>
          <Link to="/login" className="block w-full text-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
