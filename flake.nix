{
  description = "Node.js development environment with Graft";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_latest
            git
            rsync
            ansible
          ];

          NODE_ENV = "development";

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"

            echo "🚀 Node.js окружение"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""

            if [ ! -f "package.json" ]; then
              echo "📦 Проект не инициализирован. Создаём Astro + Tailwind..."
              npx create-astro@latest temp --template with-tailwindcss --install --no-git --skip-houston

              rsync -a --ignore-existing temp/ .
              rm -rf temp

              echo "📦 Добавляем Graft в проект..."
              npm install --save-dev @nanonets/graft

              echo ""
              echo "✅ Проект создан. Команды:"
              echo "   npm run dev     — запуск dev-сервера"
              echo "   npm run build   — сборка"
              echo "   graft build     — сборка графа для OpenCode"
            elif [ ! -d "node_modules" ]; then
              echo "📦 Установка зависимостей..."
              npm install
              echo "✅ Готово. Запусти: npm run dev"
            else
              # Если Graft не установлен — ставим его
              if [ ! -f "node_modules/.bin/graft" ]; then
                echo "📦 Установка Graft..."
                npm install --save-dev @nanonets/graft
              fi

              echo "✅ Проект готов. Команды:"
              echo "   npm run dev     — запуск dev-сервера"
              echo "   npm run build   — сборка"
              echo "   graft build     — сборка графа"
              echo ""
              echo "graft: $(graft --version 2>/dev/null || echo 'готов к работе')"
            fi
          '';
        };
      });
    };
}