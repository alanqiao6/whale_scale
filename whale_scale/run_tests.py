#!/usr/bin/env python
"""
Test runner script for running all project tests with code coverage reporting.
Run this script from the project root directory.

Usage:
    python run_tests.py                  # Run all tests with coverage
    python run_tests.py --no-coverage    # Run tests without coverage
    python run_tests.py --module accounts  # Run only account tests
    python run_tests.py --module main      # Run only main tests (morphometrix, collatrix, xcertainty)
"""

import os
import sys
import argparse
import django
from django.test.runner import DiscoverRunner
import coverage


def run_tests_with_coverage(test_modules=None, include_dirs=None, exclude_dirs=None, html_report=True):
    """
    Run tests with coverage and generate reports.
    
    Args:
        test_modules (list): Specific test modules to run
        include_dirs (list): Directories to include in coverage analysis
        exclude_dirs (list): Directories to exclude from coverage analysis
        html_report (bool): Whether to generate HTML coverage report
    """
    # Default test modules if none provided
    if test_modules is None:
        test_modules = ['accounts', 'main']
    
    # Default included directories if none provided
    if include_dirs is None:
        include_dirs = [
            'accounts/*.py',
            'main/*.py',
            'MMI_CODEX/*/*.py',
            'MMI_CODEX/*/*/*.py'
        ]
    
    # Default excluded directories if none provided
    if exclude_dirs is None:
        exclude_dirs = [
            'accounts/migrations/*.py',
            'main/migrations/*.py',
            '*/settings.py',
            'manage.py',
            'run_tests.py'
        ]
    
    # Initialize coverage.py
    cov = coverage.Coverage(
        source=['.'],
        include=include_dirs,
        omit=exclude_dirs
    )
    
    # Start measuring coverage
    cov.start()
    
    # Set up Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'whale_scale.settings')
    django.setup()
    
    # Run tests
    runner = DiscoverRunner(verbosity=1)
    failures = runner.run_tests(test_modules)
    
    # Stop coverage and generate report
    cov.stop()
    cov.save()
    
    # Report coverage results
    print("\n==== Coverage Summary ====")
    cov.report()
    
    # Generate HTML report if requested
    if html_report:
        cov.html_report(directory='htmlcov')
        print("\nHTML coverage report generated in 'htmlcov' directory")
    
    return failures


def run_tests_without_coverage(test_modules=None):
    """Run tests without coverage analysis."""
    # Default test modules if none provided
    if test_modules is None:
        test_modules = ['accounts', 'main']
    
    # Set up Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'whale_scale.settings')
    django.setup()
    
    # Run tests
    runner = DiscoverRunner(verbosity=1)
    failures = runner.run_tests(test_modules)
    
    return failures


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run tests with coverage reporting')
    parser.add_argument('--no-coverage', action='store_true', help='Run tests without coverage')
    parser.add_argument('--module', choices=['accounts', 'main', 'all'], default='all',
                        help='Specify which test module to run')
    parser.add_argument('--no-html', action='store_true', help='Disable HTML report generation')
    args = parser.parse_args()
    
    # Determine which test modules to run
    if args.module == 'all':
        test_modules = ['accounts', 'main']
    else:
        test_modules = [args.module]
    
    # Run tests with or without coverage
    if args.no_coverage:
        failures = run_tests_without_coverage(test_modules)
    else:
        html_report = not args.no_html
        failures = run_tests_with_coverage(test_modules, html_report=html_report)
    
    # Exit with appropriate exit code
    sys.exit(failures)