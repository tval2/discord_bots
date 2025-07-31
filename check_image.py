from PIL import Image
import numpy as np
import os
import sys
import json

# Dictionary mapping set names to letter codes
# Set names are stored in lowercase with hyphens separating words
SET_NAME_MAPPING = {
    "genetic-apex": "A1",
    "genetic-apex-premium": "A1",
    "mythical-island": "A1a", 
    "mythical-island-premium": "A1a",
    "space-time-smackdown": "A2",
    "space-time-smackdown-premium": "A2",
    "triumphant-light": "A2a",
    "triumphant-light-premium": "A2a",
    "shining-revelry": "A2b",
    "shining-revelry-premium": "A2b",
    "celestial-guardians": "A3",
    "celestial-guardians-premium": "A3",
    "extradimensional-crisis": "A3a",
    "extradimensional-crisis-premium": "A3a",
    "eevee-grove": "A3b",
    "eevee-grove-premium": "A3b",
    "wisdom-of-sea-and-sky": "A4",
    "wisdom-of-sea-and-sky-premium": "A4"
}

###
#This file takes in a godpack image as well as a set ID name
#and will return the card names for each card in the image

def get_set_code(set_name):
    """Convert a set name to its corresponding letter code"""
    set_name_lower = set_name.lower().replace(' ', '-')
    return SET_NAME_MAPPING.get(set_name_lower, set_name)

def load_set_card_images(set_to_check = 'A1'):
	all_images = []
	# Handle both running from project root and web_app directory
	images_dir = 'images'
	if not os.path.exists(images_dir):
		images_dir = '../images'
	
	set_dir = f'{images_dir}/{set_to_check}/'
	if not os.path.exists(set_dir):
		raise FileNotFoundError(f"Set directory not found: {set_dir}")
		
	for i in os.listdir(set_dir):
		img = Image.open(f'{set_dir}{i}')
		img = img.convert("L")
		img = np.array(img)
		all_images.append([img,i])
	return all_images

def get_godpack_card_img(godpack_img_path):
	### Takes in the path to a godpack image and extract the 5 card images as arrays

	#load the full image with all 5 cards
	img = Image.open(godpack_img_path)
	img = img.convert("L")
	img = np.array(img)

	#isolate the 5 images
	x_offsets = [6,385,764,195,574]
	y_offsets = [0,0,0,524,524]

	dx = 367
	dy = 512

	card_images = []
	#extract the individual card images
	for i in range(5):
		sub_img = img[y_offsets[i]:y_offsets[i] + dy,x_offsets[i]:x_offsets[i] + dx]
		card_images.append(sub_img)

	return card_images


def find_best_image(sample,set_images):
	#For a given image, finds the best matching card from a list of images from a card set
	low_score = 1e10
	best_fit = None
	for image in set_images:
		diff = np.sum(abs(sample - image[0]))
		if diff < low_score:
			low_score = diff
			best_fit = image

	return best_fit

def identify_godpack_cards(godpack_img_path, set_name):
    """Main function to identify cards in a godpack image"""
    try:
        # Convert set name to letter code
        set_code = get_set_code(set_name)
        
        # Load set images
        set_images = load_set_card_images(set_code)
        
        # Get godpack card images
        godpack_cards = get_godpack_card_img(godpack_img_path)
        
        # Identify each card
        results = []
        for i in range(5):
            best_fit = find_best_image(godpack_cards[i], set_images)
            if best_fit:
                results.append({
                    'position': i + 1,
                    'card_name': best_fit[1],
                    'confidence_score': int(np.sum(abs(godpack_cards[i] - best_fit[0])))
                })
            else:
                results.append({
                    'position': i + 1,
                    'card_name': 'Unknown',
                    'confidence_score': None
                })
        
        return {
            'success': True,
            'set_code': set_code,
            'set_name': set_name,
            'cards': results
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# Command line interface for JavaScript integration
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python check_image.py <godpack_image_path> <set_name>'
        }))
        sys.exit(1)
    
    godpack_path = sys.argv[1]
    set_name = sys.argv[2]
    
    result = identify_godpack_cards(godpack_path, set_name)
    print(json.dumps(result))
	