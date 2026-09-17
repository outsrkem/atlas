#!/bin/bash
set -euo pipefail

workspace=$(cd "$(dirname "$0")/.." && pwd)
cd "$workspace"

SRC_DIR=${workspace}
version="b0.0.0"
release="b1"
app=atlas
NODE_IMG=node:22-alpine
RPMBUILD_IMG=outsrkem/rpmbuild:4.14.3-rocky8

# ---------- 参数解析 ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version)
      [[ -z "${2:-}" || "$2" == -* ]] && { echo "Error: -v/--version needs a value"; exit 1; }
      version="$2"; shift 2 ;;
    -r|--release)
      [[ -z "${2:-}" || "$2" == -* ]] && { echo "Error: -r/--release needs a value"; exit 1; }
      release="$2"; shift 2 ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [-v|--version VERSION] [-r|--release RELEASE]"
      exit 1 ;;
  esac
done

echo "Workspace: $workspace"
echo "App name : $app"
echo "Version  : $version"
echo "Release  : $release"
echo "Node img : $NODE_IMG"

# ---------- npm build ----------
docker run --rm --net=host \
  -e HOME=/tmp \
  -v "${SRC_DIR}:/app" \
  -v /app/node_modules \
  -v npm_cache_${app}:/tmp/.npm \
  -w /app \
  "${NODE_IMG}" \
  sh -c 'npm config set registry https://mirrors.huaweicloud.com/repository/npm/ && \
         npm install --verbose --no-audit --no-fund && \
         npm run build'

if [ ! -d "${SRC_DIR}/dist" ]; then
  echo "ERROR: npm run build failed, dist directory not found!"
  exit 1
fi

product="${app}-${version}"
tar zcvf "${product}.tar.gz" --transform "s/^dist/${product}/" dist

# ---------- rpmbuild ----------
RPMBUILD_ARGS=(
  -bb
  --define "_version ${version}"
  --define "_release ${release}"
  --define "dist .el6"
  SPECS/rpm.spec
)

docker run -i --rm \
  -v "$(pwd)/.cid/atlas.spec:/root/rpmbuild/SPECS/rpm.spec:ro" \
  -v "$(pwd)/${product}.tar.gz:/root/rpmbuild/SOURCES/${product}.tar.gz:ro" \
  -v "$(pwd)/rpms:/root/rpmbuild/RPMS" \
  -w /root/rpmbuild \
  "${RPMBUILD_IMG}" \
  bash -c 'rpmbuild "$@"' _ "${RPMBUILD_ARGS[@]}"

find . '(' -name "${product}*.gz" -o -name "${product}*.rpm" ')'