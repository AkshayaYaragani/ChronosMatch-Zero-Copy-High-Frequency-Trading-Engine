"""
ChronosMatch Setup script for compiling Cython C-extension engine.
Usage:
    python3 setup.py build_ext --inplace
"""

from setuptools import setup, Extension
import sys

try:
    from Cython.Build import cythonize
    USE_CYTHON = True
except ImportError:
    USE_CYTHON = False

ext = ".pyx" if USE_CYTHON else ".c"

extensions = [
    Extension(
        "chronosmatch.chronos_engine",
        ["chronosmatch/chronos_engine" + ext],
        extra_compile_args=[
            "-O3",
            "-march=native",
            "-ffast-math",
            "-fomit-frame-pointer",
            "-pipe",
            "-fPIC",
            "-Wall",
        ],
        extra_link_args=["-O3"],
    )
]

if USE_CYTHON:
    extensions = cythonize(
        extensions,
        compiler_directives={
            "language_level": "3",
            "boundscheck": False,
            "wraparound": False,
            "cdivision": True,
            "nonecheck": False,
            "profile": False,
        },
    )

setup(
    name="chronosmatch",
    version="1.0.0",
    description="ChronosMatch: Zero-Copy High-Frequency Trading Engine",
    ext_modules=extensions,
)
