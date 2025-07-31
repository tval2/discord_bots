#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from check_image import get_set_code, SET_NAME_MAPPING

def test_premium_mapping():
    """Test the premium pack name mapping function"""
    test_cases = [
        # Regular packs
        ("Genetic Apex", "A1"),
        ("Mythical Island", "A1a"),
        ("Space-time Smackdown", "A2"),
        ("Triumphant Light", "A2a"),
        ("Shining Revelry", "A2b"),
        ("Celestial Guardians", "A3"),
        ("Extradimensional Crisis", "A3a"),
        ("Eevee Grove", "A3b"),
        ("Wisdom of Sea and Sky", "A4"),
        
        # Premium packs (should map to same codes)
        ("Genetic Apex Premium", "A1"),
        ("Mythical Island Premium", "A1a"),
        ("Space-time Smackdown Premium", "A2"),
        ("Triumphant Light Premium", "A2a"),
        ("Shining Revelry Premium", "A2b"),
        ("Celestial Guardians Premium", "A3"),
        ("Extradimensional Crisis Premium", "A3a"),
        ("Eevee Grove Premium", "A3b"),
        ("Wisdom of Sea and Sky Premium", "A4"),
        
        # Different formats
        ("genetic-apex-premium", "A1"),
        ("GENETIC-APEX-PREMIUM", "A1"),
        ("Genetic-Apex-Premium", "A1"),
    ]
    
    print("🧪 Testing premium pack mapping...")
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

def show_all_mappings():
    """Show all available pack mappings"""
    print("\n📋 All Available Pack Mappings:")
    print("=" * 50)
    
    for pack_name, code in sorted(SET_NAME_MAPPING.items()):
        display_name = pack_name.replace('-', ' ').title()
        if 'premium' in pack_name:
            print(f"🌟 {display_name:<30} -> {code}")
        else:
            print(f"📦 {display_name:<30} -> {code}")

if __name__ == "__main__":
    test_premium_mapping()
    show_all_mappings() 