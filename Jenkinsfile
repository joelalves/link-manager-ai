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

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }
}