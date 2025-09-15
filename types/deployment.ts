export enum DeploymentStep {
  IDLE = "idle",
  CREATING_PROJECT = "creating_project",
  CREATING_AUTHORIZATION = "creating_authorization",
  CREATING_STORAGE = "creating_storage",
  CONNECTING_STORAGE = "connecting_storage",
  DEPLOYING = "deploying",
  FINISHED = "finished"
}