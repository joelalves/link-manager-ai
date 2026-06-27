pipeline {
    agent any

    tools {
        nodejs 'NodeJS 14.x' // Use the NodeJS configuration from Jenkins
    }

    node {
        stage('SCM') {
            checkout scm
        }

        stage('SonarQube Analysis') {
            def scannerHome = tool 'SonarScanner';
            withSonarQubeEnv() {
            sh "${scannerHome}/bin/sonar-scanner"
            }
        }


        stage('Quality Gate') {
            timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
            }
        }

        stage('Deploy with Docker Compose') {
            sh """
            docker compose up -d --build --remove-orphans
            docker compose ps
            """
        }
    }
}
