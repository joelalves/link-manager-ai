pipeline {
    agent any

    tools {
        nodejs 'NodeJS 26.x'
    }

    stages {
        stage('SCM') {
            steps {
                checkout scm
            }
        }

        stage('Check Tools') {
            steps {
                sh """
                    node -v
                    npm -v
                    docker --version
                    docker compose version
                """
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh """
                    docker compose up -d --build --remove-orphans
                    docker compose ps
                """
            }
        }
    }
}