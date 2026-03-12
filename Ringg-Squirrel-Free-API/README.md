# Ringg Squirrel TTS v1.0 API 🐿️

## 1. Overview

Squirrel TTS is Ringg’s low‑latency text‑to‑speech (TTS) engine.  
This document explains how to call the **`generate_squirrel`** endpoint.

## 2. Endpoint Summary

- **cURL (basic example)**
  ```bash
  curl --location 'https://prod-api2.desivocal.com/dv/api/v0/tts_api/generate_squirrel'   --header 'Content-Type: application/json'   --data '{
      "text": "Hello दोस्तों! Welcome to Ringg TTS. यह एक बहुत ही शानदार text to speech system है जो Hindi और English दोनों languages को support करता है।",
      "voice_id": "83ba74e4-9efb-4db3-913a-f2a0ad66904d"
    }'
  ```
- **Method:** `POST`  
- **URL:** `https://prod-api2.desivocal.com/dv/api/v0/tts_api/generate_squirrel`  
- **Headers:** `Content-Type: application/json`
- **Request Body**
  ```json
  {
    "text": "Hello दोस्तों! Welcome to Ringg TTS. यह एक बहुत ही शानदार text to speech system है जो Hindi और English दोनों languages को support करता है।",
    "voice_id": "83ba74e4-9efb-4db3-913a-f2a0ad66904d"
  }
  ```
- **Field details**

  | Field      | Type   | Required | Description                                                                 |
  |-----------|--------|----------|-----------------------------------------------------------------------------|
  | `text`    | string | Yes      | Text you want to synthesize. Limited to **300** characters.              |
  | `voice_id`| string | Yes      | **UUID** of the voice to use. Must match one of the IDs in the voices provided below.    |
  | `return_raw_audio`| boolean | No **(default False)**      | If the endpoint should return raw audio bytes. Guide to use the bytes as wav output is shared below    |


## 3. Example Requests

**Python using `requests`**
  ```python
  import requests

  url = "https://prod-api2.desivocal.com/dv/api/v0/tts_api/generate_squirrel"

  payload = {
      "text": "Hello दोस्तों! Welcome to Ringg TTS. यह एक बहुत ही शानदार text to speech system है जो Hindi और English दोनों languages को support करता है।",
      "voice_id": "83ba74e4-9efb-4db3-913a-f2a0ad66904d",
  }

  headers = {
      "Content-Type": "application/json"
  }

  response = requests.post(url, json=payload, headers=headers)

  ```

  **Incase someone wants to use the raw audio for realtime usecase**
  ```python
    import time
    import wave
    import requests


    # Audio parameters from the API headers
    sample_rate = 24000
    channels = 1
    sample_width = 2  # 16-bit = 2 bytes

    # Save raw PCM data as WAV
    def save_pcm_as_wav(pcm_bytes: bytes, output_path: str):
      with wave.open(output_path, 'wb') as wav_file:
          wav_file.setnchannels(channels)
          wav_file.setsampwidth(sample_width)
          wav_file.setframerate(sample_rate)
          wav_file.writeframes(pcm_bytes)

    s = time.time()
    response = requests.post("https://prod-api2.desivocal.com/dv/api/v0/tts_api/generate_squirrel", json={
      "text": "Hello दोस्तों! Welcome to Ringg TTS. यह एक बहुत ही शानदार text to speech system है जो Hindi और English दोनों languages को support करता है।",
      "voice_id": "83ba74e4-9efb-4db3-913a-f2a0ad66904d",
      "return_raw_audio": True
    })

    save_pcm_as_wav(response.content, "output.wav")
    print(time.time()-s)
  ```
  
## 4. Voices Catalogue (CSV)

| id                                   | name                   | audio_gender   | languages   |
|:-------------------------------------|:-----------------------|:---------------|:------------|
| 153a9408-2959-11ef-b685-a218303b6499 | Youtube Shorts         | Male           | {hi-IN}     |
| 83ba74e4-9efb-4db3-913a-f2a0ad66904d | Standard               | Male           | {hi-IN}     |
| 34e961be-4049-4068-b382-6f31792e27b5 | Yuvak                  | Male           | {hi-IN}     |
| 6e9ebcc0-7c1e-4261-9362-9b66bf819eaf | Bigg Boss Lite         | Male           | {hi-IN}     |
| 25548131-6fcd-4aa1-9112-0601ea9cde9e | Sales Impact Lite      | Male           | {hi-IN}     |
| cfccf6f0-f92e-4793-ba89-7d19c385a4a6 | Aryan                  | Male           | {hi-IN}     |
| 9c8ab827-6b6e-45ae-936c-f41ede490ead | Sales                  | Male           | {hi-IN}     |
| f27d74e5-ea71-4697-be3e-f04bbd80c1a8 | Marketing              | Male           | {hi-IN}     |
| 0cc72d86-2959-11ef-b685-a218303b6499 | Documentary            | Male           | {hi-IN}     |
| f671e3c0-c9e2-4b7d-992e-3a8a7d7b7789 | Swapnil                | Male           | {hi-IN}     |
| e775dbe9-db42-4813-85f7-ec3d5f9934b4 | Rohit Bollywood        | Male           | {hi-IN}     |
| fd5ff2d1-baab-4277-aa0b-fcc75fa46d2f | Vivan                  | Male           | {hi-IN}     |
| 112e8972-72a4-4359-8c88-a66f2662eb9b | Advertisement          | Male           | {hi-IN}     |
| be0aae9f-1ab7-4088-8e8a-efe4648e902b | Shayar                 | Male           | {hi-IN}     |
| 0472cf70-1d18-48ba-a918-2bab820a7291 | Maharaj Ji             | Male           | {hi-IN}     |
| 59062c58-3423-4e70-9154-6ae9e5e5be48 | News                   | Male           | {hi-IN}     |
| 76d34dfb-a062-43f3-907f-b4372fe177be | Mohan Expressive       | Male           | {hi-IN}     |
| a9a87659-18c5-4751-a426-34ae4f4b19ae | Motivational           | Male           | {hi-IN}     |
| 9cca245b-4d6a-4d80-ba94-f5cf70938b6a | Dialogue Delivery      | Male           | {hi-IN}     |
| f883d522-2958-11ef-b685-a218303b6499 | Anchor                 | Male           | {hi-IN}     |
| 69b2d8a1-9664-423a-9d5d-0163b8930a04 | Motivational Lite      | Male           | {en-US}     |
| d23f90a6-f3c7-4c22-a68f-166e82a039d5 | Youtube Shorts Lite    | Male           | {en-US}     |
| 3ccb64b4-8a8b-4abe-ab73-40a2ea307b08 | Adam                   | Male           | {en-US}     |
| 154a73c6-c8b8-4e71-99b1-fdf2dfbd1bd0 | Crime Podcast          | Male           | {en-US}     |
| b4c093ee-05ad-43cc-9e6d-0bdaadc857ba | 1970s Media            | Male           | {en-US}     |
| d993c661-4fd5-4f3a-ac5f-ce6727e69d5e | Documentary Lite       | Male           | {en-US}     |
| 9c77f9a3-abe0-47d2-8fed-13b0a21d83b6 | Storyteller Lite       | Male           | {en-US}     |
| 24deb8ec-add3-4ef8-8cdb-faed5393d99f | News Lite              | Male           | {en-IN}     |
| 229a3560-ce6c-4969-a88d-749db1231e33 | Mohan Expressive Lite  | Male           | {en-IN}     |
| 4c2e77e8-7f10-4608-9957-e93939da63dc | Fiction                | Female         | {hi-IN}     |
| 4089f7a4-b39a-4407-8ee4-4b3bef60b7e8 | Standard               | Female         | {hi-IN}     |
| f0c65873-9fe1-48a6-ac38-cdf1293bb74e | Meditation Lite        | Female         | {hi-IN}     |
| 19f41593-8cec-4b16-b375-a6f6ca76db10 | Kamala                 | Female         | {hi-IN}     |
| f40076ea-6aeb-4687-9889-3b773fbaa9f3 | Wamika Lite            | Female         | {hi-IN}     |
| d4025456-83a0-45da-a15b-3ffcce0cd6b8 | Marketing Lite         | Female         | {hi-IN}     |
| c990fbbc-7981-4ed6-b3f1-ee109299b628 | Palomi                 | Female         | {hi-IN}     |
| 237e7675-3d90-4d6f-856c-c8def47df71f | Janvi                  | Female         | {hi-IN}     |
| ffade7c0-2958-11ef-b685-a218303b6499 | Anchor                 | Female         | {hi-IN}     |
| 199af31c-3d08-4f80-9879-772f91994797 | Rakul Lite             | Female         | {hi-IN}     |
| edb596de-1e85-4adb-89aa-a5e58f67fdee | Neha                   | Female         | {hi-IN}     |
| cd9e2d83-063f-4b21-9045-38a7a1fa9f66 | Teacher                | Female         | {hi-IN}     |
| 57d7a45c-013a-4e63-b26c-c3c24d57d13e | Nisha                  | Female         | {hi-IN}     |
---
