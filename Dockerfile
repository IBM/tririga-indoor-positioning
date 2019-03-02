FROM ubuntu:16.04
RUN apt-get update -y && \
    apt-get upgrade -y
RUN bash -c 'curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash'
COPY .bash_profile_nvm /root/.bash_profile
COPY .bashrc /root/.bashrc
RUN bash -c "source /root/.bash_profile && \
    nvm install v8.9.0 && \
    nvm use 8.9.0 && \
    nvm alias default 8.9.0"
RUN mkdir -p /opt/tririga-perceptive/
COPY app /opt/tririga-perceptive/
COPY app.js /opt/tririga-perceptive/
COPY data /opt/tririga-perceptive/
CMD bash -c "source /root/.bash_profile && nvm use 8.9.0 && npm start --prefix /opt/tririga-perceptive/"
