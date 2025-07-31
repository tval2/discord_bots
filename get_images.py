import requests
import os
#https://pocket.limitlesstcg.com/cards

#set tag, start card #, end card #
# --- set info --- #
sets = [['A1',227,279],
        ['A1a',69,84],
        ['A2',156,203],
        ['A2a',76,94],
        ['A2b',73,95],
        ['A3',156,207],
        ['A3a',70,87],
        ['A3b',70,91],
        ['A4',162,209]
        ]


for set_info in sets:
    set_id = set_info[0]
    if set_id in os.listdir('images/'):
        continue

    #if directory doesn't exist, make it
    os.mkdir(f'images/{set_id}')
    print(set_info)
    for i in range(set_info[1],set_info[2]+1):
        num = str(i).zfill(3)
        url = f"https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/{set_id}/{set_id}_{num}_EN_SM.webp"
        filename = f'images/{set_id}/' + url.split("/")[-1]  # get the filename from the URL
        response = requests.get(url)
        if response.status_code == 200:
            with open(filename, "wb") as f:
                f.write(response.content)
                print(f"✅ Downloaded {filename}")
        else:
            print(f"❌ Failed to download {url} (status {response.status_code})")