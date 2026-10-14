pipeline {
  agent any
  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }
  environment {
    APP        = 'safeops-360-web'   // nama image, container, dan project compose
    HEALTH_URL = 'http://safeops-360-web:3000/login'
    NETWORK    = 'safeops-network'   // network dari docker-compose.yml
  }
  stages {
    stage('Test') {
      steps {
        sh 'docker build --target test -t $APP:test .'
      }
    }
    stage('Build') {
      steps {
        // NEXT_PUBLIC_* di-inline saat build; mocking wajib disabled di production
        sh 'docker build --build-arg NEXT_PUBLIC_API_MOCKING=disabled -t $APP:$GIT_COMMIT .'
      }
    }
    stage('Deploy') {
      when { anyOf { branch 'main'; branch 'ci/docker-jenkinsfile' } }
      steps {
        sh 'IMAGE_TAG=$GIT_COMMIT docker compose up -d --no-build --remove-orphans'
      }
    }
    stage('Health check') {
      when { anyOf { branch 'main'; branch 'ci/docker-jenkinsfile' } }
      steps {
        // Jenkins tidak join ke safeops-network, jadi curl dijalankan dari container sementara di network itu.
        sh '''
          for i in $(seq 1 30); do
            docker run --rm --network "$NETWORK" curlimages/curl:8.10.1 \
              -fsS -o /dev/null "$HEALTH_URL" && exit 0
            sleep 2
          done
          echo "Health check gagal"; docker logs --tail 100 $APP; exit 1
        '''
        sh 'docker tag $APP:$GIT_COMMIT $APP:latest'
      }
    }
  }
  post {
    always {
      cleanWs()
    }
    success {
      // simpan 5 image terakhir untuk rollback, hapus sisanya
      sh '''
        docker images $APP --format '{{.Tag}}' | grep -vE '^(latest|test)$' \
          | tail -n +6 | xargs -r -I{} docker rmi $APP:{} || true
        docker image prune -f
      '''
    }
  }
}
