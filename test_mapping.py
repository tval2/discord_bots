#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from check_image import get_set_code, SET_NAME_MAPPING

def test_set_mapping():
    """Test the set name mapping function"""
    test_cases = [
        ("Genetic Apex", "A1"),
        ("Mythical Island", "A1a"),
        ("Space-time Smackdown", "A2"),
        ("Triumphant Light", "A2a"),
        ("Shining Revelry", "A2b"),
        ("Celestial Guardians", "A3"),
        ("Extradimensional Crisis", "A3a"),
        ("Eevee Grove", "A3b"),
        ("Wisdom of Sea and Sky", "A4"),
        # Test with different formats
        ("genetic apex", "A1"),
        ("GENETIC APEX", "A1"),
        ("Genetic-Apex", "A1"),
        ("genetic-apex", "A1"),
    ]
    
    print("🧪 Testing set name mapping...")
    all_passed = True
    
    for input_name, expected_code in test_cases:
        result = get_set_code(input_name)
        if result == expected_code:
            print(f"✅ '{input_name}' -> {result}")
        else:
            print(f"❌ '{input_name}' -> {result} (expected {expected_code})")
            all_passed = False
    
    print(f"\n{'🎉 All tests passed!' if all_passed else '❌ Some tests failed!'}")
    return all_passed

if __name__ == "__main__":
    test_set_mapping() 