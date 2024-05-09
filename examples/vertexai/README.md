# Example for Gemini and VertexAI

Example for using Gemini LLM and Embeddings with `textembedding-gecko` on VertexAI.

```
const llmApplication = await new RAGApplicationBuilder()
    .setModel(new VertexAI({ modelName: 'gemini-1.5-pro-preview-0409'}))
    .setEmbeddingModel(new GeckoEmbedding())
```

List of Gemini LLM models: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models.


## VertexAI on Google Cloud Platform

- Playground: https://console.cloud.google.com/vertex-ai/generative/multimodal/

- Gemini Documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/overview

- VertexAI Pricing: https://cloud.google.com/vertex-ai/generative-ai/pricing

### Setup VertexAI

#### 1. Setup GCP Project, gcloud CLI and Vertex AI
Instructions: (https://cloud.google.com/vertex-ai/docs/start/cloud-environment)

#### 2. (Optional) [Create a new Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts) with least permissive role. 
_You can use role [Vertex AI User](https://cloud.google.com/vertex-ai/docs/general/access-control#aiplatform.user) `roles/aiplatform.user`._

#### 3. Authentication
 
 Documentation: [VertexAI Authentication](https://cloud.google.com/vertex-ai/docs/authentication)

Option 1) `gcloud CLI` Application Default Login.  **Prefered for local development.**
 
Documentation: https://cloud.google.com/docs/authentication/application-default-credentials#personal

 You should be logged in an account, which have permissions for the project.
  ```
  gcloud auth application-default login
  ```

Option 2) On Google Cloud Platform: using a service account which have permissions to the project and VertexAI

Documentation: https://cloud.google.com/vertex-ai/docs/authentication#on-gcp

Option 3) Environment variable with path to JSON key for Service Account

Documentation: https://cloud.google.com/docs/authentication/application-default-credentials#GAC

- Download the Service Account's key after you have created it in Step 2.

- Setup `GOOGLE_APPLICATION_CREDENTIALS` .env variable with the path to the downloaded JSON credentials:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

NOTE: Using service account with JSON key can impose security risk if not stored correctly. Please revise [Best Practices](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys).

