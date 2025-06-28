import os
from google.cloud import aiplatform
from google.cloud.aiplatform.gapic.schema import prediction_service
from google.api_core import exceptions
from dotenv import load_dotenv

load_dotenv()

def configure_gemini():
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT environment variable not set")
        
        aiplatform.init(project=project_id, location="us-central1")
        
        endpoint = aiplatform.Endpoint(
            endpoint_name="projects/{}/locations/us-central1/endpoints/gemini-pro".format(project_id)
        )
        
        models = endpoint.list_models()
        
        print("Available Gemini models:")
        for model in models:
            if model.supported_generation_methods and "generateContent" in model.supported_generation_methods:
                print(f"- {model.display_name} ({model.name})")
                
        return True
        
    except exceptions.GoogleAPIError as e:
        print(f"Google API Error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected errorTyler: {e}")
        return False

if __name__ == "__main__":
    configure_gemini()