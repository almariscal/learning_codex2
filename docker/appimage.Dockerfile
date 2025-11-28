FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        git \
        gnupg \
        libayatana-appindicator3-dev \
        libfuse2 \
        libgtk-3-dev \
        libsoup2.4-dev \
        libwebkit2gtk-4.0-dev \
        libjavascriptcoregtk-4.0-dev \
        librsvg2-dev \
        patchelf \
        libssl-dev \
        pkg-config \
        python3.11 \
        python3.11-venv \
        python3.11-dev \
        unzip \
        wget \
        xz-utils && \
    rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.11 /usr/bin/python3 && \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3 && \
    python3 -m pip install --upgrade pip

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g npm@latest && \
    rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /workspace
COPY . .

RUN npm --prefix frontend install
RUN npm --prefix desktop/tauri install

RUN bash backend/scripts/build_backend_exe.sh

RUN rm -rf desktop/tauri/src-tauri/backend && \
    mkdir -p desktop/tauri/src-tauri/backend && \
    if [ -d backend/dist/parking-backend ]; then \
        cp -r backend/dist/parking-backend/. desktop/tauri/src-tauri/backend/; \
    else \
        echo "Backend binary not found under backend/dist/parking-backend"; \
        exit 1; \
    fi

RUN npm --prefix desktop/tauri run build

RUN set -euo pipefail && \
    mkdir -p /artifacts && \
    find desktop/tauri/src-tauri/target/release/bundle -name '*.AppImage' -print -exec cp {} /artifacts/ \; && \
    if [ -z "$(ls -A /artifacts)" ]; then \
        echo "No AppImage artifact generated. Check tauri build logs above."; \
        exit 1; \
    fi

CMD ["bash"]
