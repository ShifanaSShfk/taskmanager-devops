// Jenkinsfile
// Declarative Pipeline syntax — more structured than Scripted Pipeline.
// Jenkins reads this file automatically when you connect the repo.

pipeline {

    // Run on any available agent (Jenkins worker node)
    agent any

    // ── Environment variables ───────────────────────────────────────
    environment {
        IMAGE_NAME    = 'taskmanager-api'
        REGISTRY      = credentials('dockerhub-username')   // Jenkins credential
        DOCKER_PASS   = credentials('dockerhub-token')
        NODE_VERSION  = '18'
    }

    // ── Build options ───────────────────────────────────────────────
    options {
        timeout(time: 30, unit: 'MINUTES')    // Kill the build if it runs over 30min
        buildDiscarder(logRotator(numToKeepStr: '10'))  // Keep last 10 build logs
        disableConcurrentBuilds()             // Don't run two builds at the same time
    }

    // ── Triggers ────────────────────────────────────────────────────
    triggers {
        // Poll GitHub every 5 minutes for changes
        // In production, use a GitHub webhook instead (instant trigger)
        pollSCM('H/5 * * * *')
    }

    // ── Stages ──────────────────────────────────────────────────────
    stages {

        stage('Checkout') {
            steps {
                // Checkout the code from GitHub
                checkout scm
                echo "Building branch: ${env.BRANCH_NAME}"
                echo "Commit: ${env.GIT_COMMIT[0..7]}"
            }
        }

        stage('Install dependencies') {
            steps {
                // Use the Node.js tool configured in Jenkins
                nodejs(nodeJSInstallationName: "Node-${NODE_VERSION}") {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                nodejs(nodeJSInstallationName: "Node-${NODE_VERSION}") {
                    sh 'npm run lint'
                }
            }
        }

        stage('Unit tests') {
            steps {
                nodejs(nodeJSInstallationName: "Node-${NODE_VERSION}") {
                    sh 'npm run test:unit -- --ci'
                    // --ci flag: fails if coverage drops below threshold
                }
            }
            post {
                always {
                    // Publish the JUnit test report in Jenkins UI
                    junit 'coverage/junit.xml'
                    // Publish coverage report
                    publishHTML([
                        allowMissing: false,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('Integration tests') {
            // Spin up real services for integration testing
            // Uses Docker Compose to start postgres + redis
            steps {
                sh '''
                    docker compose -f docker-compose.yml up -d postgres redis
                    sleep 10    # Wait for services to be healthy
                '''
                nodejs(nodeJSInstallationName: "Node-${NODE_VERSION}") {
                    withEnv([
                        'NODE_ENV=test',
                        'DB_HOST=localhost',
                        'DB_PORT=5432',
                        'DB_NAME=taskmanager_test',
                        'DB_USER=postgres',
                        'DB_PASSWORD=testpassword',
                        'REDIS_HOST=localhost',
                        'REDIS_PORT=6379',
                        'JWT_SECRET=jenkins-test-secret-32-chars-min'
                    ]) {
                        sh 'npm run test:integration -- --ci'
                    }
                }
            }
            post {
                always {
                    // Always tear down docker services, even if tests fail
                    sh 'docker compose down -v'
                }
            }
        }

        stage('Build Docker image') {
            steps {
                script {
                    def commitHash = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    def imageTag = "${env.BRANCH_NAME}-${commitHash}"

                    sh """
                        docker build \
                          --target production \
                          -t ${IMAGE_NAME}:${imageTag} \
                          -t ${IMAGE_NAME}:latest \
                          .
                    """

                    // Store the tag for use in the next stage
                    env.IMAGE_TAG = imageTag
                }
            }
        }

        stage('Push to registry') {
            // Only push from main or develop branches (not feature branches)
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                sh """
                    echo ${DOCKER_PASS} | docker login -u ${REGISTRY} --password-stdin
                    docker tag ${IMAGE_NAME}:${env.IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:${env.IMAGE_TAG}
                    docker push ${REGISTRY}/${IMAGE_NAME}:${env.IMAGE_TAG}
                    docker logout
                """
            }
        }

        stage('Deploy to staging') {
            // Only deploy to staging from the develop branch
            when {
                branch 'develop'
            }
            steps {
                echo "Deploying ${env.IMAGE_TAG} to staging..."
                sh """
                    docker compose -f docker-compose.yml \
                                   -f docker-compose.prod.yml \
                      up -d --no-deps api
                """
                // Wait for the app to be healthy
                sh '''
                    for i in $(seq 1 12); do
                      if curl -sf http://localhost:3000/health; then
                        echo "Staging is healthy"
                        exit 0
                      fi
                      echo "Waiting for staging... ($i/12)"
                      sleep 5
                    done
                    echo "Staging health check failed!"
                    exit 1
                '''
            }
        }

    } // end stages

    // ── Post-build actions ──────────────────────────────────────────
    post {
        success {
            echo "Pipeline succeeded for ${env.BRANCH_NAME} — ${env.GIT_COMMIT[0..7]}"
            // In production: send Slack notification here
        }
        failure {
            echo "Pipeline FAILED for ${env.BRANCH_NAME}"
            // In production: send alert to team
        }
        always {
            // Clean up workspace to save disk space
            cleanWs()
        }
    }

} // end pipeline