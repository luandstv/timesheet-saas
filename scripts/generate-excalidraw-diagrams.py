"""Gera os diagramas editáveis do Jornix em formato Excalidraw."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


OUTPUT_DIR = Path(__file__).resolve().parents[1] / "docs" / "diagrams"

COLORS = {
    "primary_fill": "#3b82f6",
    "primary_stroke": "#1e3a5f",
    "secondary_fill": "#60a5fa",
    "tertiary_fill": "#93c5fd",
    "start_fill": "#fed7aa",
    "start_stroke": "#c2410c",
    "success_fill": "#a7f3d0",
    "success_stroke": "#047857",
    "warning_fill": "#fee2e2",
    "warning_stroke": "#dc2626",
    "decision_fill": "#fef3c7",
    "decision_stroke": "#b45309",
    "error_fill": "#fecaca",
    "error_stroke": "#b91c1c",
    "title": "#1e40af",
    "subtitle": "#3b82f6",
    "detail": "#64748b",
    "on_light": "#374151",
    "dark_fill": "#1e293b",
    "dark_text": "#ffffff",
    "data_text": "#22c55e",
}


class Diagram:
    def __init__(self) -> None:
        self.elements: list[dict[str, Any]] = []
        self.counter = 0

    def _id(self, prefix: str) -> str:
        self.counter += 1
        return f"{prefix}-{self.counter:03d}"

    def _common(self, element: dict[str, Any]) -> dict[str, Any]:
        seed = self.counter * 7919
        return {
            **element,
            "angle": 0,
            "roughness": 0,
            "opacity": 100,
            "isDeleted": False,
            "groupIds": [],
            "frameId": None,
            "boundElements": None,
            "link": None,
            "locked": False,
            "seed": seed,
            "version": 1,
            "versionNonce": seed + 17,
        }

    def text(
        self,
        value: str,
        x: float,
        y: float,
        width: float,
        *,
        font_size: int = 16,
        color: str | None = None,
        align: str = "left",
    ) -> str:
        element_id = self._id("text")
        lines = value.count("\n") + 1
        element = self._common(
            {
                "id": element_id,
                "type": "text",
                "x": x,
                "y": y,
                "width": width,
                "height": max(24, lines * font_size * 1.35),
                "text": value,
                "originalText": value,
                "fontSize": font_size,
                "fontFamily": 3,
                "textAlign": align,
                "verticalAlign": "top",
                "strokeColor": color or COLORS["detail"],
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "containerId": None,
                "lineHeight": 1.25,
            }
        )
        self.elements.append(element)
        return element_id

    def shape(
        self,
        kind: str,
        x: float,
        y: float,
        width: float,
        height: float,
        fill: str,
        stroke: str,
        *,
        dashed: bool = False,
    ) -> str:
        element_id = self._id(kind)
        element = self._common(
            {
                "id": element_id,
                "type": kind,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "strokeColor": stroke,
                "backgroundColor": fill,
                "fillStyle": "solid",
                "strokeWidth": 2,
                "strokeStyle": "dashed" if dashed else "solid",
                "roundness": {"type": 3} if kind == "rectangle" else None,
            }
        )
        self.elements.append(element)
        return element_id

    def node(
        self,
        label: str,
        x: float,
        y: float,
        width: float,
        height: float,
        fill: str,
        stroke: str,
        *,
        font_size: int = 17,
        text_color: str | None = None,
        kind: str = "rectangle",
    ) -> str:
        element_id = self.shape(kind, x, y, width, height, fill, stroke)
        lines = label.count("\n") + 1
        text_height = lines * font_size * 1.35
        self.text(
            label,
            x + 16,
            y + max(12, (height - text_height) / 2),
            width - 32,
            font_size=font_size,
            color=text_color
            or (
                COLORS["on_light"]
                if fill
                in {
                    COLORS["secondary_fill"],
                    COLORS["tertiary_fill"],
                    COLORS["start_fill"],
                    COLORS["success_fill"],
                    COLORS["decision_fill"],
                    COLORS["warning_fill"],
                    COLORS["error_fill"],
                }
                else COLORS["dark_text"]
            ),
            align="center",
        )
        return element_id

    def arrow(
        self,
        x: float,
        y: float,
        points: list[list[float]],
        color: str = COLORS["primary_stroke"],
        *,
        dashed: bool = False,
    ) -> str:
        element_id = self._id("arrow")
        max_x = max(point[0] for point in points)
        min_x = min(point[0] for point in points)
        max_y = max(point[1] for point in points)
        min_y = min(point[1] for point in points)
        element = self._common(
            {
                "id": element_id,
                "type": "arrow",
                "x": x,
                "y": y,
                "width": max_x - min_x,
                "height": max_y - min_y,
                "strokeColor": color,
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 2,
                "strokeStyle": "dashed" if dashed else "solid",
                "points": points,
                "startBinding": None,
                "endBinding": None,
                "startArrowhead": None,
                "endArrowhead": "arrow",
            }
        )
        self.elements.append(element)
        return element_id

    def line(
        self,
        x: float,
        y: float,
        points: list[list[float]],
        color: str = COLORS["detail"],
        *,
        dashed: bool = False,
    ) -> str:
        element_id = self._id("line")
        element = self._common(
            {
                "id": element_id,
                "type": "line",
                "x": x,
                "y": y,
                "width": max(point[0] for point in points),
                "height": max(point[1] for point in points),
                "strokeColor": color,
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "dashed" if dashed else "solid",
                "points": points,
            }
        )
        self.elements.append(element)
        return element_id

    def evidence(self, content: str, x: float, y: float, width: float, height: float) -> str:
        element_id = self.shape(
            "rectangle", x, y, width, height, COLORS["dark_fill"], COLORS["primary_stroke"]
        )
        lines = content.count("\n") + 1
        self.text(
            content,
            x + 18,
            y + 18,
            width - 36,
            font_size=15,
            color=COLORS["data_text"],
        )
        return element_id

    def save(self, name: str, title: str, subtitle: str) -> None:
        self.text(title, 80, 50, 1350, font_size=30, color=COLORS["title"])
        self.text(subtitle, 80, 96, 1350, font_size=17, color=COLORS["detail"])
        data = {
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": self.elements,
            "appState": {"viewBackgroundColor": "#ffffff", "gridSize": 20},
            "files": {},
        }
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / name).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )


def architecture() -> None:
    diagram = Diagram()
    diagram.node(
        "Browser\nusuário autenticado",
        100,
        250,
        220,
        100,
        COLORS["start_fill"],
        COLORS["start_stroke"],
        kind="ellipse",
    )
    diagram.node(
        "Next.js App Router\nrotas e componentes",
        430,
        210,
        300,
        180,
        COLORS["primary_fill"],
        COLORS["primary_stroke"],
    )
    diagram.text(
        "/dashboard  ·  /reports\n/adjustments  ·  /workspaces",
        455,
        322,
        250,
        font_size=14,
        color=COLORS["dark_text"],
        align="center",
    )
    diagram.node(
        "Serviços e Server Actions\nregras de negócio",
        850,
        210,
        320,
        180,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
    )
    diagram.text(
        "time-entry · adjustment\nworkspace · report",
        875,
        322,
        270,
        font_size=14,
        color=COLORS["primary_stroke"],
        align="center",
    )
    diagram.node(
        "Prisma + Supabase\nPostgreSQL e autenticação",
        1290,
        210,
        280,
        180,
        COLORS["tertiary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
    )
    diagram.arrow(320, 300, [[0, 0], [110, 0]], COLORS["start_stroke"])
    diagram.arrow(730, 300, [[0, 0], [120, 0]], COLORS["primary_stroke"])
    diagram.arrow(1170, 300, [[0, 0], [120, 0]], COLORS["primary_stroke"])
    diagram.text("Server Actions / queries", 735, 264, 120, font_size=13, color=COLORS["detail"])

    diagram.text("Caminho de uma batida de ponto", 100, 500, 400, font_size=22, color=COLORS["title"])
    diagram.node(
        "Entrada ou saída\n15:27:40",
        100,
        560,
        220,
        100,
        COLORS["start_fill"],
        COLORS["start_stroke"],
        kind="ellipse",
    )
    diagram.node(
        "Validação\nintervalo e idempotência",
        430,
        560,
        250,
        100,
        COLORS["decision_fill"],
        COLORS["decision_stroke"],
    )
    diagram.node(
        "Timesheet + TimeEntry\nregistro persistido",
        790,
        560,
        270,
        100,
        COLORS["success_fill"],
        COLORS["success_stroke"],
        text_color=COLORS["success_stroke"],
    )
    diagram.node(
        "Relatórios e extras\napuração consolidada",
        1170,
        560,
        280,
        100,
        COLORS["tertiary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
    )
    diagram.arrow(320, 610, [[0, 0], [110, 0]], COLORS["start_stroke"])
    diagram.arrow(680, 610, [[0, 0], [110, 0]], COLORS["decision_stroke"])
    diagram.arrow(1060, 610, [[0, 0], [110, 0]], COLORS["success_stroke"])
    diagram.evidence(
        "timeEntryService.createEntry()\n→ Prisma transaction\n→ dateOnlyStart(America/Sao_Paulo)",
        430,
        720,
        620,
        120,
    )
    diagram.save(
        "architecture.excalidraw",
        "Arquitetura do Jornix",
        "O fluxo separa interface, regras de negócio e persistência para manter a jornada auditável.",
    )


def time_entry_lifecycle() -> None:
    diagram = Diagram()
    diagram.text("Fluxo de registros de ponto", 100, 180, 800, font_size=22, color=COLORS["title"])
    diagram.text(
        "A mesma jornada suporta vários pares de entrada e saída no mesmo dia, inclusive sobreaviso.",
        100,
        220,
        1100,
        font_size=16,
        color=COLORS["detail"],
    )
    diagram.node(
        "Ação do usuário\nBater entrada/saída",
        100,
        310,
        220,
        100,
        COLORS["start_fill"],
        COLORS["start_stroke"],
        kind="ellipse",
    )
    diagram.node(
        "Validação\nusuário + workspace",
        430,
        310,
        240,
        100,
        COLORS["decision_fill"],
        COLORS["decision_stroke"],
    )
    diagram.node(
        "Registro persistido\nTimeEntry",
        780,
        310,
        230,
        100,
        COLORS["primary_fill"],
        COLORS["primary_stroke"],
    )
    diagram.node(
        "Par efetivo\nentrada → saída",
        1120,
        310,
        230,
        100,
        COLORS["success_fill"],
        COLORS["success_stroke"],
        text_color=COLORS["success_stroke"],
    )
    diagram.arrow(320, 360, [[0, 0], [110, 0]], COLORS["start_stroke"])
    diagram.arrow(670, 360, [[0, 0], [110, 0]], COLORS["decision_stroke"])
    diagram.arrow(1010, 360, [[0, 0], [110, 0]], COLORS["success_stroke"])

    diagram.text("Fan-out: N pares na mesma data", 1120, 485, 300, font_size=18, color=COLORS["title"])
    diagram.node(
        "08:00 Entrada\n12:00 Saída",
        900,
        550,
        210,
        90,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.node(
        "13:00 Entrada\n17:00 Saída",
        1210,
        550,
        210,
        90,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.arrow(1235, 410, [[0, 0], [-230, 140]], COLORS["success_stroke"])
    diagram.arrow(1235, 410, [[0, 0], [80, 140]], COLORS["success_stroke"])
    diagram.evidence(
        "Regra civil\nAmerica/Sao_Paulo\n\n16/09 15:27:40 → 16/09 19:12:43",
        100,
        520,
        420,
        210,
    )
    diagram.node(
        "Apuração\nhoras normais + extras",
        670,
        720,
        300,
        100,
        COLORS["tertiary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
    )
    diagram.arrow(1010, 640, [[0, 0], [-190, 80]], COLORS["success_stroke"])
    diagram.arrow(1320, 640, [[0, 0], [-350, 80]], COLORS["success_stroke"])
    diagram.save(
        "time-entry-lifecycle.excalidraw",
        "Ciclo de uma jornada",
        "Cada batida fica preservada e a apuração trabalha sobre pares efetivos, sem limitar o dia a uma entrada e uma saída.",
    )


def adjustment_approval() -> None:
    diagram = Diagram()
    lanes = [(120, "Colaborador"), (540, "Servidor"), (960, "Gestor"), (1370, "Apuração")]
    for x, label in lanes:
        diagram.text(label, x - 30, 180, 180, font_size=18, color=COLORS["title"], align="center")
        diagram.line(x + 60, 225, [[0, 600]], COLORS["detail"], dashed=True)

    diagram.node(
        "Solicita correção\nou inclusão",
        45,
        280,
        210,
        90,
        COLORS["start_fill"],
        COLORS["start_stroke"],
        kind="ellipse",
        font_size=16,
    )
    diagram.arrow(255, 325, [[0, 0], [225, 0]], COLORS["start_stroke"])
    diagram.node(
        "Valida somente\ntimeSheet afetada",
        420,
        280,
        240,
        90,
        COLORS["decision_fill"],
        COLORS["decision_stroke"],
        font_size=16,
    )
    diagram.arrow(660, 325, [[0, 0], [225, 0]], COLORS["decision_stroke"])
    diagram.node(
        "Pedido pendente\ncom justificativa",
        845,
        280,
        230,
        90,
        COLORS["primary_fill"],
        COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.arrow(1075, 325, [[0, 0], [225, 0]], COLORS["primary_stroke"])
    diagram.node(
        "Confirma ou rejeita\no pedido",
        1220,
        280,
        240,
        90,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.arrow(1340, 370, [[0, 0], [0, 100]], COLORS["primary_stroke"])
    diagram.node(
        "Transação atômica\naplica a decisão",
        1180,
        470,
        260,
        95,
        COLORS["success_fill"],
        COLORS["success_stroke"],
        text_color=COLORS["success_stroke"],
        font_size=16,
    )
    diagram.arrow(1180, 520, [[0, 0], [-560, 0]], COLORS["success_stroke"])
    diagram.node(
        "Entradas efetivas\ne resumo mensal",
        490,
        470,
        270,
        95,
        COLORS["tertiary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.arrow(760, 520, [[0, 0], [555, 0]], COLORS["success_stroke"])
    diagram.node(
        "Relatório\ne extras",
        1320,
        650,
        190,
        85,
        COLORS["success_fill"],
        COLORS["success_stroke"],
        text_color=COLORS["success_stroke"],
        font_size=16,
    )
    diagram.arrow(1440, 565, [[0, 0], [0, 85]], COLORS["success_stroke"])
    diagram.evidence(
        "requestId único\n→ evita duplicidade\n\nvalidateTimeSheets(tx, ids)\n→ escopo afetado",
        420,
        650,
        500,
        170,
    )
    diagram.arrow(540, 565, [[0, 0], [0, 85]], COLORS["primary_stroke"])
    diagram.text(
        "Rejeição retorna ao colaborador sem alterar o registro original.",
        960,
        815,
        530,
        font_size=15,
        color=COLORS["detail"],
    )
    diagram.save(
        "adjustment-approval.excalidraw",
        "Ajustes: solicitação até a apuração",
        "O registro original permanece auditável; a mudança só afeta a apuração depois da decisão permitida.",
    )


def data_api_rls() -> None:
    diagram = Diagram()
    diagram.text(
        "Acesso público via Supabase Data API",
        100,
        180,
        900,
        font_size=22,
        color=COLORS["title"],
    )
    diagram.node(
        "Cliente/browser\nchave publicável",
        100,
        250,
        250,
        100,
        COLORS["start_fill"],
        COLORS["start_stroke"],
        kind="ellipse",
        font_size=16,
    )
    diagram.node(
        "PostgREST\n/rest/v1",
        470,
        235,
        250,
        130,
        COLORS["primary_fill"],
        COLORS["primary_stroke"],
        font_size=17,
    )
    diagram.node(
        "Tabelas public\nRLS ativo + grants revogados",
        840,
        235,
        300,
        130,
        COLORS["decision_fill"],
        COLORS["decision_stroke"],
        text_color=COLORS["on_light"],
        font_size=16,
    )
    diagram.node(
        "401 / 42501\npermission denied",
        1270,
        250,
        260,
        100,
        COLORS["error_fill"],
        COLORS["error_stroke"],
        kind="ellipse",
        text_color=COLORS["error_stroke"],
        font_size=16,
    )
    diagram.arrow(350, 300, [[0, 0], [120, 0]], COLORS["start_stroke"])
    diagram.arrow(720, 300, [[0, 0], [120, 0]], COLORS["primary_stroke"])
    diagram.arrow(1140, 300, [[0, 0], [130, 0]], COLORS["error_stroke"])
    diagram.evidence(
        'GET /rest/v1/_prisma_migrations?select=id&limit=1\n\nrole: anon\n→ 401 { code: "42501" }',
        470,
        440,
        670,
        180,
    )

    diagram.text(
        "Acesso do servidor — caminho usado pela aplicação",
        100,
        690,
        1000,
        font_size=22,
        color=COLORS["title"],
    )
    diagram.node(
        "Next.js\nServer Actions / services",
        100,
        750,
        270,
        110,
        COLORS["tertiary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.node(
        "Prisma 7\nconexão postgres",
        500,
        750,
        270,
        110,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.node(
        "PostgreSQL\nschema public",
        900,
        750,
        270,
        110,
        COLORS["secondary_fill"],
        COLORS["primary_stroke"],
        text_color=COLORS["primary_stroke"],
        font_size=16,
    )
    diagram.node(
        "migrate deploy\nesquema versionado",
        1300,
        750,
        250,
        110,
        COLORS["success_fill"],
        COLORS["success_stroke"],
        text_color=COLORS["success_stroke"],
        font_size=16,
    )
    diagram.arrow(370, 805, [[0, 0], [130, 0]], COLORS["primary_stroke"])
    diagram.arrow(770, 805, [[0, 0], [130, 0]], COLORS["primary_stroke"])
    diagram.arrow(1170, 805, [[0, 0], [130, 0]], COLORS["success_stroke"])
    diagram.text(
        "A chave pública continua disponível para autenticação; os dados da aplicação não são lidos diretamente pelo browser.",
        100,
        900,
        1450,
        font_size=16,
        color=COLORS["detail"],
    )
    diagram.save(
        "data-api-rls.excalidraw",
        "Fronteira de dados do Jornix",
        "RLS e grants fecham o caminho público; Prisma continua sendo o único caminho de dados da aplicação.",
    )


if __name__ == "__main__":
    architecture()
    time_entry_lifecycle()
    adjustment_approval()
    data_api_rls()
