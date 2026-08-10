pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        COMPOSE_PROJECT_NAME = 'link-manager-ai'
    }

    tools {
        nodejs 'NodeJS 20.x'
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
                    echo "Node version:"
                    node -v

                    echo "NPM version:"
                    npm -v

                    echo "Docker version:"
                    docker --version

                    echo "Docker Compose version:"
                    docker compose version

                    echo "Current containers:"
                    docker ps
                """
            }
        }
        
        stage('Validate Docker Compose') {
            steps {
                sh """
                    docker compose config --quiet
                """
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                sh """
                    if [ -f frontend/package-lock.json ]; then
                        cd frontend
                        npm ci
                    elif [ -f frontend/package.json ]; then
                        cd frontend
                        npm install
                    else
                        echo "No frontend package.json found. Skipping frontend install."
                    fi
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
                timeout(time: 15, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate abortPipeline: false

                        if (qg.status != 'OK') {
                            unstable "SonarQube Quality Gate failed: ${qg.status}"
                        }
                    }
                }
            }
        }

        stage('Strix Security Scan') {
            environment {
                STRIX_LLM = credentials('strix-llm')
                LLM_API_KEY = credentials('strix-llm-api-key')
            }
            steps {
                script {
                    def status = sh(
                        script: '''
                            set -o pipefail
                            curl -sSL https://strix.ai/install | bash
                            strix -n -t ./ --scan-mode quick | tee strix-report.log
                        ''',
                        returnStatus: true
                    )
                    if (status != 0) {
                        unstable "Strix flagged potential findings (exit code ${status}) — see strix-report.log"
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'strix-report.log', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                    docker compose build --pull
                """
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh """
                    docker compose up -d --remove-orphans
                    docker compose ps
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully: code analyzed and application deployed..'
        }

        failure {
            echo 'Pipeline failed. Showing Docker Compose status:'
            sh 'docker compose ps || true'
        }

        always {
            echo 'Pipeline finished.'
        }
    }
}