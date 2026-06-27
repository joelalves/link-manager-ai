pipeline {
    agent any

    tools {
        nodejs 'NodeJS 22.x'
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
                    withSonarQubeEnv() {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
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