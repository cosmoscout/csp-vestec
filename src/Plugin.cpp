////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR //
//      and may be used under the terms of the MIT license. See the LICENSE file
//      for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR) //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "Plugin.hpp"

#include "../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/InputManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-utils/convert.hpp"
#include "../../../src/cs-utils/filesystem.hpp"

#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernel/VistaSystem.h>

// Include VESTEC nodes
#include "VestecNodes/CinemaDBNode.hpp"
#include "VestecNodes/CriticalPointsNode.hpp"
#include "VestecNodes/DiseasesSensorInputNode.hpp"
#include "VestecNodes/DiseasesSimulationNode.hpp"
#include "VestecNodes/IncidentConfigNode.hpp"
#include "VestecNodes/IncidentNode.hpp"
#include "VestecNodes/PersistenceNode.hpp"
#include "VestecNodes/TextureLoaderNode.hpp"
#include "VestecNodes/TextureRenderNode.hpp"
#include "VestecNodes/TextureUploadNode.hpp"
#include "VestecNodes/TransferFunctionSourceNode.hpp"
#include "VestecNodes/UncertaintyRenderNode.hpp"
#include "VestecNodes/WildFireSourceNode.hpp"

////////////////////////////////////////////////////////////////////////////////////////////////////

EXPORT_FN cs::core::PluginBase *create() { return new csp::vestec::Plugin; }

////////////////////////////////////////////////////////////////////////////////////////////////////

EXPORT_FN void destroy(cs::core::PluginBase *pluginBase) { delete pluginBase; }

////////////////////////////////////////////////////////////////////////////////////////////////////

// Init data dir
std::string csp::vestec::Plugin::dataDir;
std::string csp::vestec::Plugin::vestecServer;
std::string csp::vestec::Plugin::vestecDownloadDir;
std::string csp::vestec::Plugin::vestecDiseasesDir;
std::string csp::vestec::Plugin::vestecTexturesDir;

////////////////////////////////////////////////////////////////////////////////////////////////////

namespace csp::vestec {

////////////////////////////////////////////////////////////////////////////////////////////////////

void from_json(nlohmann::json const &j, Plugin::Settings &o) {
  cs::core::Settings::deserialize(j, "vestec-topo-dir", o.mVestecDataDir);
  cs::core::Settings::deserialize(j, "vestec-fire-dir", o.mFireDir);
  cs::core::Settings::deserialize(j, "vestec-diseases-dir", o.mDiseasesDir);
  cs::core::Settings::deserialize(j, "vestec-server", o.mVestecServer);
  cs::core::Settings::deserialize(j, "vestec-download-dir",
                                  o.mVestecDownloadDir);
  cs::core::Settings::deserialize(j, "vestec-textures-dir",
                                  o.mVestecTexturesDir);
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::init() {
  logger().info("[CSP::VESTEC::Initialize] CosmoScout VR Plugin for the VESTEC "
                "EU project");

  // Add the VESTEC tab to the sidebar
  mGuiManager->addPluginTabToSideBarFromHTML(
      "VESTEC", "whatshot", "../share/resources/gui/vestec_settings.html");

  mGuiManager->addCssToGui("third-party/css/jquery-ui.min.css");
  mGuiManager->addCssToGui("css/vestec.css");

  mGuiManager->addScriptToGuiFromJS(
      "../share/resources/gui/third-party/js/alight.min.js");
  mGuiManager->addScriptToGuiFromJS(
      "../share/resources/gui/third-party/js/jquery-ui.min.js");
  mGuiManager->addScriptToGuiFromJS(
      "../share/resources/gui/third-party/js/d3-node-editor.js");

  auto vestecNodeEditorHtml = cs::utils::filesystem::loadToString(
      "../share/resources/gui/vestec_node_editor.html");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.addHtml",
                                        vestecNodeEditorHtml, "body");
  auto vestecIncidentHtml = cs::utils::filesystem::loadToString(
      "../share/resources/gui/vestec_incident_window.html");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.addHtml",
                                        vestecIncidentHtml, "body");
  mGuiManager->getGui()->callJavascript("CosmoScout.gui.initDraggableWindows");

  mGuiManager->addScriptToGuiFromJS(
      "../share/resources/gui/js/csp-vestec-node-editor.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/vestec.js");
  mGuiManager->addScriptToGuiFromJS("../share/resources/gui/js/csp-vestec.js");

  // Register a callback to toggle the node editor.
  std::string callback = "vestecNodeEditor.toggle";
  mGuiManager->getGui()->registerCallback(
      callback, "Toggles the Vestec Node Editor.", std::function([this]() {
        mGuiManager->getGui()->executeJavascript(
            "document.getElementById('csp-vestec-node-editor').classList."
            "toggle('visible')");
      }));

  // Add a timeline button to toggle the node editor.
  mGuiManager->addTimelineButton("Toggle Vestec Node Editor", "dashboard",
                                 callback);

  mGuiManager->getGui()->registerCallback(
      "vestec.addStartMark", "", std::function([this]() {
        auto intersection = mInputManager->pHoveredObject.get().mObject;

        if (!intersection) {
          return;
        }

        auto body =
            std::dynamic_pointer_cast<cs::scene::CelestialBody>(intersection);

        if (!body || body->getCenterName() != "Earth") {
          return;
        }

        auto radii = body->getRadii();

        if (!mTool) {
          mTool = std::make_shared<csp::vestec::IncidentsBoundsTool>(
              mInputManager, mSolarSystem, mAllSettings, mTimeControl,
              body->getCenterName(), body->getFrameName());
        } else {
          if (mPointsActive) {
            mTool->reset();
            mPointsActive = false;
            return;
          }
        }

        mTool->addPoints(cs::utils::convert::cartesianToLngLat(
            mInputManager->pHoveredObject.get().mPosition, radii));

        mTool->pStartPosition.connect([this](glm::vec2 latlong) {
          std::string data =
              std::to_string(cs::utils::convert::toDegrees(latlong[0])) + " " +
              std::to_string(cs::utils::convert::toDegrees(latlong[1]));
          mGuiManager->getGui()->callJavascript(
              "CosmoScout.vestec.setStartLatLong", data);
        });

        mTool->pEndPosition.connect([this](glm::vec2 latlong) {
          std::string data =
              std::to_string(cs::utils::convert::toDegrees(latlong[0])) + " " +
              std::to_string(cs::utils::convert::toDegrees(latlong[1]));
          mGuiManager->getGui()->callJavascript(
              "CosmoScout.vestec.setEndLatLong", data);
        });

        mPointsActive = true;
      }));

  mGuiManager->getGui()->registerCallback("vestec.removeMarks", "",
                                          std::function([this]() {
                                            if (mTool) {
                                              mTool->reset();
                                              mPointsActive = false;
                                            }
                                          }));

  mGuiManager->getGui()->registerCallback(
      "vestec.setServer", "",
      std::function([](std::string server) { Plugin::vestecServer = server; }));

  // Read the plugin settings from the scene config
  mPluginSettings = mAllSettings->mPlugins.at("csp-vestec");

  // add anchor node and register to solar system
  mVestecTransform = std::make_shared<cs::scene::CelestialAnchorNode>(
      mSceneGraph->GetRoot(), mSceneGraph->GetNodeBridge(), "", "Earth",
      "IAU_Earth");
  mSolarSystem->registerAnchor(mVestecTransform);

  // Set the data dir which is used by other classes
  Plugin::dataDir = mPluginSettings.mVestecDataDir;
  Plugin::vestecServer = mPluginSettings.mVestecServer;
  Plugin::vestecDownloadDir = mPluginSettings.mVestecDownloadDir;
  Plugin::vestecDiseasesDir = mPluginSettings.mDiseasesDir;
  Plugin::vestecTexturesDir = mPluginSettings.mVestecTexturesDir;

  if (!boost::filesystem::exists(mPluginSettings.mVestecDownloadDir)) {
    cs::utils::filesystem::createDirectoryRecursively(
        mPluginSettings.mVestecDownloadDir + "/extracted");
  }

  // Initialize vestec flow editor
  m_pNodeEditor = new VNE::NodeEditor(mGuiManager->getGui());

  // TODO:Create the Node editor
  m_pNodeEditor->RegisterSocketType("CINEMA_DB");
  m_pNodeEditor->RegisterSocketType("PATH");
  m_pNodeEditor->RegisterSocketType("POINT_ARRAY");
  m_pNodeEditor->RegisterSocketType("TEXTURES");
  m_pNodeEditor->RegisterSocketType("INCIDENT");
  m_pNodeEditor->RegisterSocketType("INCIDENT_CONFIG");
  m_pNodeEditor->RegisterSocketType("TRANSFER_FUNCTION");

  // Register our node types for the flow editor
  m_pNodeEditor->RegisterNodeType(
      TransferFunctionSourceNode::GetName(), "Sources",
      [this](cs::gui::GuiItem *webView, int id) {
        return new TransferFunctionSourceNode(mPluginSettings, webView, id);
      },
      [](VNE::NodeEditor *editor) {
        TransferFunctionSourceNode::Init(editor);
      });

  m_pNodeEditor->RegisterNodeType(
      CinemaDBNode::GetName(), "Sources",
      [](cs::gui::GuiItem *webView, int id) {
        return new CinemaDBNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { CinemaDBNode::Init(editor); });

  // m_pNodeEditor->RegisterNodeType(
  //    WildFireSourceNode::GetName(), "Sources",
  //    [this](cs::gui::GuiItem* webView, int id) {
  //      return new WildFireSourceNode(mPluginSettings, webView, id);
  //    },
  //    [](VNE::NodeEditor* editor) { WildFireSourceNode::Init(editor); });

  // m_pNodeEditor->RegisterNodeType(
  //    DiseasesSensorInputNode::GetName(), "Sources",
  //    [this](cs::gui::GuiItem* webView, int id) {
  //      return new DiseasesSensorInputNode(mPluginSettings, webView, id);
  //    },
  //    [](VNE::NodeEditor* editor) { DiseasesSensorInputNode::Init(editor); });

  // m_pNodeEditor->RegisterNodeType(
  //    DiseasesSimulation::GetName(), "Sources",
  //    [this](cs::gui::GuiItem* webView, int id) {
  //      return new DiseasesSimulation(mPluginSettings, webView, id);
  //    },
  //    [](VNE::NodeEditor* editor) { DiseasesSimulation::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      TextureUploadNode::GetName(), "Sources",
      [](cs::gui::GuiItem *webView, int id) {
        return new TextureUploadNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { TextureUploadNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      TextureLoaderNode::GetName(), "Sources",
      [](cs::gui::GuiItem *webView, int id) {
        return new TextureLoaderNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { TextureLoaderNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      IncidentNode::GetName(), "Sources",
      [](cs::gui::GuiItem *webView, int id) {
        return new IncidentNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { IncidentNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      IncidentConfigNode::GetName(), "Sources",
      [](cs::gui::GuiItem *webView, int id) {
        return new IncidentConfigNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { IncidentConfigNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      PersistenceNode::GetName(), "Renderer",
      [](cs::gui::GuiItem *webView, int id) {
        return new PersistenceNode(webView, id);
      },
      [](VNE::NodeEditor *editor) { PersistenceNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      TextureRenderNode::GetName(), "Renderer",
      [this](cs::gui::GuiItem *webView, int id) {
        return new TextureRenderNode(mPluginSettings, webView, id,
                                     mSolarSystem.get(), mVestecTransform.get(),
                                     mGraphicsEngine.get());
      },
      [](VNE::NodeEditor *editor) { TextureRenderNode::Init(editor); });

  m_pNodeEditor->RegisterNodeType(
      CriticalPointsNode::GetName(), "Renderer",
      [this](cs::gui::GuiItem *webView, int id) {
        return new CriticalPointsNode(
            mPluginSettings, webView, id, mSolarSystem.get(),
            mVestecTransform.get(), mGraphicsEngine.get());
      },
      [](VNE::NodeEditor *editor) { CriticalPointsNode::Init(editor); });

  // m_pNodeEditor->RegisterNodeType(
  //    UncertaintyRenderNode::GetName(), "Renderer",
  //    [this](cs::gui::GuiItem* webView, int id) {
  //      return new UncertaintyRenderNode(mPluginSettings, webView, id,
  //      mSolarSystem.get(),
  //          mVestecTransform.get(), mGraphicsEngine.get());
  //    },
  //    [](VNE::NodeEditor* editor) { UncertaintyRenderNode::Init(editor); });

  // Initialize the editor in HTML and JavaScript
  m_pNodeEditor->InitNodeEditor();

  mGuiManager->getGui()->callJavascript("CosmoScout.vestec.setServer",
                                        mPluginSettings.mVestecServer);
  mGuiManager->getGui()->callJavascript("CosmoScout.vestec.setDownloadDir",
                                        mPluginSettings.mVestecDownloadDir);

  logger().info("[CSP::VESTEC::Initialize] Done");
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::deInit() {
  mSolarSystem->unregisterAnchor(mVestecTransform);
  mSceneGraph->GetRoot()->DisconnectChild(mVestecTransform.get());
  delete m_pNodeEditor;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void Plugin::update() {
  // auto  simTime = mTimeControl->pSimulationTime.get();
  // float timeOfDay =
  //    cs::utils::convert::time::toPosix(simTime).time_of_day().total_milliseconds()
  //    / 1000.0;
  // Update plugin per frame

  if (mTool) {
    mTool->update();
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

} // namespace csp::vestec
