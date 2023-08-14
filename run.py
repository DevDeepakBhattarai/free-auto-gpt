

import requests
from bs4 import BeautifulSoup

# URL of the website to scrape
url = "https://example.com"
response = requests.get(url)
soup = BeautifulSoup(response.content, "html.parser")

# Find elements using their HTML tags and attributes
target_elements = soup.find_all("div", class_="target-class")

# Extract and print the desired information
for element in target_elements:
    print(element.text)
